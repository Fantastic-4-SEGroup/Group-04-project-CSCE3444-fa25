import React from 'react';

const PlaylistView = ({ playlist }) => {
  if (!playlist || playlist.length === 0) {
    return <p>Your generated playlist will appear here.</p>;
  }

  return (
    <div>
      <h3>Your Playlist</h3>
      <ul>
        {playlist.map(song => (
          <li key={song.id}>
            {song.title} by {song.artist}
            <div>
              <button>Like</button>
              <button>Skip</button>
            </div>
          </li>
        ))}
      </ul>
      <button>Share</button>
      <button>Export</button>
    </div>
  );
};

export default PlaylistView;
