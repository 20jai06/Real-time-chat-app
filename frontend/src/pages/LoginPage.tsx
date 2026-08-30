import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const res = await axios.post(`${apiUrl}/api/auth/login`, { username, password });
      login(res.data.token, res.data.username, res.data.id);
      navigate('/chat');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex justify-center items-center h-full bg-gradient-to-br from-indigo-900 to-purple-900 w-full font-sans">
      <div className="w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-white tracking-tight">Welcome Back</h2>
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-6 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-indigo-200 text-sm font-semibold mb-2">Username</label>
            <input 
              type="text" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="Enter your username"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-indigo-200 text-sm font-semibold mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="Enter your password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-200">
            Login
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/register" className="text-indigo-300 hover:text-white transition-colors text-sm">Don't have an account? Register</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
