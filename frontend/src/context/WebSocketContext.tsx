import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  client: Client | null;
  connected: boolean;
  subscribeToChat: (chatId: number, callback: (event: any) => void) => () => void;
  sendMessage: (chatId: number, content: string, type?: string, imageUrl?: string | null) => void;
  editMessage: (messageId: number, newContent: string) => void;
  readMessage: (messageId: number, chatId: number) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (client) {
        client.deactivate();
        setClient(null);
        setConnected(false);
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    
    const newClient = new Client({
      webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    newClient.onConnect = (frame) => {
      console.log('Connected: ' + frame);
      setConnected(true);
    };

    newClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    newClient.onWebSocketClose = () => {
      setConnected(false);
    };

    newClient.activate();
    setClient(newClient);

    return () => {
      newClient.deactivate();
    };
  }, [isAuthenticated, token]);

  const subscribeToChat = (chatId: number, callback: (event: any) => void) => {
    if (!client || !connected) return () => {};
    
    const subscription = client.subscribe('/user/queue/messages', (message: IMessage) => {
      const parsedEvent = JSON.parse(message.body);
      // parsedEvent = { eventType: 'NEW'|'EDIT'|'READ', payload: Message }
      if (parsedEvent.payload && parsedEvent.payload.chat && parsedEvent.payload.chat.id === chatId) {
        callback(parsedEvent);
      } else if (parsedEvent.chat && parsedEvent.chat.id === chatId) {
        // Fallback for old direct message payloads if any
        callback({ eventType: 'NEW', payload: parsedEvent });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = (chatId: number, content: string, type: string = 'TEXT', imageUrl: string | null = null) => {
    if (client && connected) {
      client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ chatId, content, type, imageUrl })
      });
    }
  };

  const editMessage = (messageId: number, newContent: string) => {
    if (client && connected) {
      client.publish({
        destination: '/app/chat.edit',
        body: JSON.stringify({ messageId, newContent })
      });
    }
  };

  const readMessage = (messageId: number, chatId: number) => {
    if (client && connected) {
      client.publish({
        destination: '/app/chat.read',
        body: JSON.stringify({ messageId, chatId })
      });
    }
  };

  return (
    <WebSocketContext.Provider value={{ client, connected, subscribeToChat, sendMessage, editMessage, readMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
