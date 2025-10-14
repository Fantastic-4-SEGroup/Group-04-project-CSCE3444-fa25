import React, { useState } from 'react';

const MoodSelector = ({ onMoodSelected }) => {
  const moods = ['Calm', 'Energetic', 'Nostalgic', 'Joyful'];

  return (
    <div>
      <h2>How are you feeling today?</h2>
      <div>
        {moods.map(mood => (
          <button key={mood} onClick={() => onMoodSelected(mood)}>
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
