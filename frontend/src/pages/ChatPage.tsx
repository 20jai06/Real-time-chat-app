import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';

interface Chat {
  id: number;
  name: string | null;
  groupChat: boolean;
  users: { id: number; username: string; status: string }[];
}

interface Message {
  id: number;
  content: string;
  sender: { id: number; username: string };
  timestamp: string;
  type: string;
  imageUrl?: string;
  editedAt?: string;
  readBy: { id: number; username: string }[];
}

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { connected, subscribeToChat, sendMessage, editMessage, readMessage } = useWebSocket();
  const navigate = useNavigate();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  
  const [newChatUser, setNewChatUser] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadChats();
  }, [user]);

  useEffect(() => {
    if (activeChat && connected) {
      loadMessages(activeChat.id);
      const unsubscribe = subscribeToChat(activeChat.id, (event: any) => {
        const payload = event.payload;
        if (event.eventType === 'NEW') {
          setMessages(prev => {
            if (!prev.find(m => m.id === payload.id)) {
              return [...prev, payload];
            }
            return prev;
          });
          if (payload.sender.username !== user?.username) {
            readMessage(payload.id, activeChat.id);
          }
        } else if (event.eventType === 'EDIT' || event.eventType === 'READ') {
          setMessages(prev => prev.map(m => m.id === payload.id ? payload : m));
        }
      });
      return () => unsubscribe();
    }
  }, [activeChat, connected]);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const loadChats = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/chats`);
      setChats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const res = await axios.get(`${apiUrl}/api/chats/${chatId}/messages`);
      setMessages(res.data);
      // Mark as read
      res.data.forEach((msg: Message) => {
        if (msg.sender.username !== user?.username && !msg.readBy.find(u => u.username === user?.username)) {
          readMessage(msg.id, chatId);
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;
    
    if (editingMessageId) {
      editMessage(editingMessageId, messageInput);
      setEditingMessageId(null);
    } else {
      sendMessage(activeChat.id, messageInput);
    }
    setMessageInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeChat) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      sendMessage(activeChat.id, '📸 Image', 'IMAGE', base64String);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const createPrivateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatUser.trim()) return;
    try {
      const res = await axios.post(`${apiUrl}/api/chats`, {
        name: null,
        isGroupChat: false,
        usernames: [newChatUser]
      });
      setChats([...chats, res.data]);
      setActiveChat(res.data);
      setNewChatUser('');
    } catch (err) {
      console.error(err);
      alert('Could not create chat');
    }
  };

  const getChatName = (chat: Chat): string => {
    if (chat.groupChat) return chat.name || 'Group Chat';
    const otherUser = chat.users.find(u => u.username !== user?.username);
    return otherUser ? otherUser.username : 'Unknown';
  };

  return (
    <div className="flex h-full w-full bg-[#1E1E2E] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-[#181825] flex flex-col border-r border-[#313244]">
        <div className="p-5 bg-[#11111B] flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-lg tracking-wide">{user?.username}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-xs bg-[#F38BA8]/10 text-[#F38BA8] hover:bg-[#F38BA8] hover:text-[#11111B] px-3 py-1.5 rounded-md font-semibold transition-all">Logout</button>
        </div>
        
        <div className="p-4 border-b border-[#313244]">
          <form onSubmit={createPrivateChat} className="flex">
            <input 
              type="text" 
              placeholder="Find user..." 
              className="flex-1 bg-[#313244] border-none rounded-l-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-[#A6ADC8] text-sm"
              value={newChatUser}
              onChange={e => setNewChatUser(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-r-lg font-semibold transition-colors text-sm">Add</button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${isActive ? 'bg-indigo-600 shadow-md text-white' : 'hover:bg-[#313244] text-[#CDD6F4]'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-white/20' : 'bg-[#45475A]'}`}>
                  {getChatName(chat).charAt(0).toUpperCase()}
                </div>
                <div className="font-medium truncate">{getChatName(chat)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#1E1E2E]">
        {activeChat ? (
          <>
            <div className="px-6 py-4 border-b border-[#313244] flex justify-between items-center shadow-sm z-10 bg-[#1E1E2E]/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#45475A] flex items-center justify-center font-bold text-lg">
                  {getChatName(activeChat!).charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-xl">{getChatName(activeChat!)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-[#F38BA8]'}`}></div>
                <span className="text-xs font-semibold text-[#A6ADC8] uppercase tracking-wider">
                  {connected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, idx) => {
                const isMe = msg.sender.username === user?.username;
                const showHeader = idx === 0 || messages[idx-1].sender.username !== msg.sender.username;
                const isRead = msg.readBy && msg.readBy.some(u => u.username !== msg.sender.username);
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      {!isMe && showHeader && <div className="text-xs font-bold text-[#A6ADC8] mb-1 ml-2">{msg.sender.username}</div>}
                      <div className={`px-5 py-3 rounded-2xl ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-600/20' : 'bg-[#313244] text-[#CDD6F4] rounded-tl-sm'} shadow-md relative group`}>
                        {msg.type === 'IMAGE' && msg.imageUrl ? (
                           <img src={msg.imageUrl} alt="attachment" className="max-w-full rounded-lg mb-2 max-h-64 object-cover" />
                        ) : null}
                        <div className="leading-relaxed flex items-end gap-2 justify-between">
                          <span>{msg.content}</span>
                          <div className="flex items-center gap-1 opacity-70 mt-1 min-w-max">
                            <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {msg.editedAt && <span className="text-[9px] italic">(edited)</span>}
                            {isMe && (
                              <span className="text-[12px] ml-1 tracking-tighter">
                                {isRead ? <span className="text-blue-300">✓✓</span> : <span>✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                        {isMe && msg.type !== 'IMAGE' && (
                          <div className={`absolute top-0 -left-8 opacity-0 group-hover:opacity-100 transition-opacity flex`}>
                            <button onClick={() => { setEditingMessageId(msg.id); setMessageInput(msg.content); }} className="text-[#A6ADC8] hover:text-white p-1 rounded-full hover:bg-white/10">
                              ✎
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 bg-[#181825]">
              {editingMessageId && (
                <div className="text-xs text-indigo-400 mb-2 flex justify-between">
                  <span>Editing message...</span>
                  <button onClick={() => { setEditingMessageId(null); setMessageInput(''); }} className="hover:text-white">Cancel</button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-3 items-center">
                <label className="cursor-pointer bg-[#313244] hover:bg-[#45475A] text-[#A6ADC8] hover:text-white rounded-xl w-12 h-[52px] flex items-center justify-center transition-colors">
                  📎
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <input 
                  type="text" 
                  className="flex-1 bg-[#313244] border-none rounded-xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-[#A6ADC8] transition-shadow"
                  placeholder={`Message @${getChatName(activeChat!)}`} 
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                />
                <button type="submit" className="bg-indigo-600 text-white rounded-xl px-8 py-3.5 font-bold hover:bg-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center">
                  {editingMessageId ? 'Save' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-[#A6ADC8]">
            <div className="w-24 h-24 mb-6 rounded-full bg-[#313244] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#6C7086]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to Chat</h3>
            <p className="max-w-xs text-center text-sm">Select a conversation from the sidebar or start a new one to begin messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
