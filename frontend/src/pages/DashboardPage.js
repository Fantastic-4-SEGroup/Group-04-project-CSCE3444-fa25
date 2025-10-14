import React, { useState, useEffect } from 'react';
import MoodSelector from '../components/MoodSelector';
import PlaylistView from '../components/PlaylistView';
import Calendar from '../components/Calendar';
import api from '../services/api';

const DashboardPage = () => {
  const [playlist, setPlaylist] = useState([]);
  const [calendarEntries, setCalendarEntries] = useState([]);

  useEffect(() => {
    // Fetch calendar data on component mount
    const fetchCalendar = async () => {
      try {
        const res = await api.get('/user/calendar');
        setCalendarEntries(res.data.calendar);
      } catch (err) {
        console.error('Error fetching calendar', err);
      }
    };
    fetchCalendar();
  }, []);

  const handleMoodSelected = async (mood) => {
    try {
      const res = await api.post('/playlists/generate', { mood });
      setPlaylist(res.data.playlist);
    } catch (err) {
      console.error('Error generating playlist', err);
    }
  };

  return (
    <div>
      <h2>Your Dashboard</h2>
      <MoodSelector onMoodSelected={handleMoodSelected} />
      <PlaylistView playlist={playlist} />
      <Calendar entries={calendarEntries} />
    </div>
  );
};

export default DashboardPage;
