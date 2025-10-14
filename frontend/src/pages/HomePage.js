import React from 'react';
import { Link } from 'react-router-dom';
import MoodSelector from '../components/MoodSelector';

const HomePage = () => {
  const handleGuestPreview = (mood) => {
    console.log(`Generating guest preview for mood: ${mood}`);
    // In a real app, call the guest preview API endpoint
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Welcome to MoodSync'd</h1>
      <p>Your personal, emotionally-driven playlist generator.</p>
      <div>
        <Link to="/register"><button>Create Account</button></Link>
        <Link to="/login"><button>Login</button></Link>
      </div>
      <hr style={{ margin: '2rem 0' }} />
      <h2>Try a Guest Preview</h2>
      <MoodSelector onMoodSelected={handleGuestPreview} />
    </div>
  );
};

export default HomePage;
