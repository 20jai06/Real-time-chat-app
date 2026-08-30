import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      if (!apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;
      const res = await axios.post(`${apiUrl}/api/auth/register`, { username, password });
      login(res.data.token, res.data.username, res.data.id);
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data || 'Registration failed');
    }
  };

  return (
    <div className="flex justify-center items-center h-full bg-gradient-to-br from-indigo-900 to-purple-900 w-full font-sans">
      <div className="w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-white tracking-tight">Create Account</h2>
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-6 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-indigo-200 text-sm font-semibold mb-2">Username</label>
            <input 
              type="text" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all" 
              placeholder="Choose a username"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-indigo-200 text-sm font-semibold mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all" 
              placeholder="Create a secure password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-pink-500/30 transition-all duration-200">
            Register
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-pink-300 hover:text-white transition-colors text-sm">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
