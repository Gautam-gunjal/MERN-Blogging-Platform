// Admin.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Admin.css';

const API = process.env.REACT_APP_API || '/api';

export default function Admin(){
  const navigate = useNavigate();
  const [users,setUsers]=useState([]);
  const [posts,setPosts]=useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    // check current user + token from localStorage
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    let currentUser = null;
    try {
      currentUser = rawUser ? JSON.parse(rawUser) : null;
    } catch (e) {
      currentUser = null;
    }

    // if not logged in or not admin, redirect away
    if (!token || !currentUser || currentUser.role !== 'admin') {
      navigate('/home', { replace: true });
      return;
    }

    // otherwise fetch admin data
    fetchAdminData();
    // eslint-disable-next-line 
  }, []);

  async function fetchAdminData(){
    setLoading(true);
    setErr('');
    try {
      const token = localStorage.getItem('token');
      if(!token) {
        navigate('/home', { replace: true });
        return;
      }
      const base = process.env.REACT_APP_API || '/api';
      const r1 = await axios.get(`${base}/admin/users`, { headers:{ Authorization: 'Bearer '+token } });
      const r2 = await axios.get(`${base}/admin/posts`, { headers:{ Authorization: 'Bearer '+token } });
      setUsers(r1.data || []);
      setPosts(r2.data || []);
    } catch (error) {
      // if backend says forbidden, send user away
      if (error?.response?.status === 403) {
        navigate('/home', { replace: true });
        return;
      }
      setErr(error?.response?.data?.message || error.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function delUser(id){
    if(!confirm('Delete user?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/admin/users/${id}`, { headers:{ Authorization: 'Bearer '+token } });
      fetchAdminData();
    } catch (error) {
      if (error?.response?.status === 403) {
        navigate('/home', { replace: true });
        return;
      }
      setErr(error?.response?.data?.message || 'Failed to delete user');
    }
  }

  async function delPost(id){
    if(!confirm('Delete post?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/admin/posts/${id}`, { headers:{ Authorization: 'Bearer '+token } });
      fetchAdminData();
    } catch (error) {
      if (error?.response?.status === 403) {
        navigate('/home', { replace: true });
        return;
      }
      setErr(error?.response?.data?.message || 'Failed to delete post');
    }
  }

  if (loading) return <div className="admin">Loading admin dashboard…</div>;

  // ----- ADDED: totals (total users and total uploads) -----
  const totalUsers = Array.isArray(users) ? users.length : 0;
  const totalUploads = Array.isArray(posts) ? posts.length : 0;
  // ---------------------------------------------------------

  return (
    <div className='admin admin-page'>
      <h3>Admin Dashboard</h3>
      {err && <div className="admin-error" style={{ color: 'red', marginBottom: 12 }}>{err}</div>}

      {/* stats */}
      <div className="admin-stats" aria-hidden={false}>
        <div className="stat-card" title="Total users">
          <div className="stat-number">{totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card" title="Total uploads">
          <div className="stat-number">{totalUploads}</div>
          <div className="stat-label">Total Uploads</div>
        </div>
      </div>

      <section>
        <h4>Users</h4>
        {users.length === 0 ? <div>No users found.</div> :
          users.map(u=> (
            <div key={u._id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <div style={{ flex: 1 }}>{u.username} ({u.email}) {u.role === 'admin' && <strong style={{ marginLeft:8 }}>[admin]</strong>}</div>
              <button onClick={()=>delUser(u._id)}>Delete</button>
            </div>
          ))
        }
      </section>

      <section style={{ marginTop: 20 }}>
        <h4>Posts</h4>
        {posts.length === 0 ? (
          <div>No posts found.</div>
        ) : (
          <>
            {/* header row: Title (left) + Author (center) */}
            <div className="admin-item admin-item-header">
              <div className="admin-item-main">
                <div className="admin-item-title admin-item-title-label">Title</div>
                <div className="admin-item-author admin-item-author-label">Author</div>
              </div>
              {/* placeholder so \"Author\" lines up above author names */}
              <div className="admin-item-action admin-item-action-label" aria-hidden></div>
            </div>

            {posts.map(p=> (
              <div key={p._id} className="admin-item">
                <div className="admin-item-main">
                  <div className="admin-item-title" title={p.title}>{p.title}</div>
                  <div className="admin-item-author">{p.authorName}</div>
                </div>
                <button onClick={()=>delPost(p._id)}>Delete</button>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
