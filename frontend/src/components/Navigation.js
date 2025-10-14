import React from 'react';
import { NavLink } from 'react-router-dom';

const Navigation = () => {
  // In a real app, you'd have logic to show/hide links based on auth status
  const isAuthenticated = false; // Placeholder

  return (
    <nav>
      <NavLink to="/" className="brand">MoodSync'd</NavLink>
      <div>
        <NavLink to="/">Home</NavLink>
        {isAuthenticated ? (
          <NavLink to="/dashboard">Dashboard</NavLink>
        ) : (
          <NavLink to="/login">Login</NavLink>
        )}
        <NavLink to="/tutorial">Tutorial</NavLink>
      </div>
    </nav>
  );
};

export default Navigation;
