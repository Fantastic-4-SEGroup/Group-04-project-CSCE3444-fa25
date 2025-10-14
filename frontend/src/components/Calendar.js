import React from 'react';

const Calendar = ({ entries }) => {
  return (
    <div>
      <h4>Your Mood Calendar</h4>
      <ul>
        {entries && entries.map(entry => (
          <li key={entry.date}>{entry.date}: {entry.mood}</li>
        ))}
      </ul>
    </div>
  );
};

export default Calendar;
