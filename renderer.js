
// DOM Elements
const audioPlayer = document.getElementById('audio-player');
const albumCover = document.getElementById('album-cover');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const progressBar = document.getElementById('progress');
const playPauseBtn = document.getElementById('play-pause-button');
const prevBtn = document.getElementById('prev-button');
const nextBtn = document.getElementById('next-button');
const menuBtn = document.getElementById('menu-button');
const centerBtn = document.getElementById('center-button');
const menuOverlay = document.getElementById('menu-overlay');
const menuItems = document.querySelectorAll('.menu-item');

// Pre-defined playlists
const playlists = [
  {
    name: 'Favorites',
    tracks: [0, 2, 5]  // Indices from musicLibrary
  },
  {
    name: 'Chill',
    tracks: [0, 4]
  },
  {
    name: 'Workout',
    tracks: [3, 5]
  }
];

// App state
let currentTrackIndex = 0;
let isPlaying = false;
let menuActive = false;
let selectedMenuItem = 0;
let currentScreen = 'nowPlaying';
let selectedListItem = 0;
let navigationHistory = [];
let currentListItems = [];
let shuffleMode = false;
let repeatMode = 'off'; // 'off', 'one', 'all'
let backlightTimeout = 30; // seconds
let currentPlaylistTracks = []; // Holds indices of tracks in current context
let isPlaylistActive = false; // Whether we're playing from a specific playlist

// Initialize player
function initPlayer() {
  loadTrack(currentTrackIndex);
  
  // Event listeners
  playPauseBtn.addEventListener('click', togglePlayPause);
  nextBtn.addEventListener('click', handleNextButton);
  prevBtn.addEventListener('click', handlePrevButton);
  centerBtn.addEventListener('click', handleCenterButton);
  menuBtn.addEventListener('click', handleMenuButton);
  
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('ended', handleTrackEnded);
  
  // Also allow menu item selection by clicking
  menuItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      selectedMenuItem = index;
      updateSelectedMenuItem();
      selectMenuItem(index);
    });
  });
}

// Load track
function loadTrack(trackIndex) {
  const track = musicLibrary[trackIndex];
  
  // In a real app, verify these files exist
  audioPlayer.src = track.path;
  albumCover.src = track.cover;
  songTitle.textContent = track.title;
  artistName.textContent = track.artist;
  
  // Reset progress
  currentTimeEl.textContent = '0:00';
  progressBar.style.width = '0%';
  
  // Get total time
  audioPlayer.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audioPlayer.duration);
  });
}

// Toggle Play/Pause
function togglePlayPause() {
  if (isPlaying) {
    audioPlayer.pause();
    playPauseBtn.innerHTML = '▶'; // Play symbol
  } else {
    audioPlayer.play();
    playPauseBtn.innerHTML = '||'; // Pause symbol
  }
  isPlaying = !isPlaying;
}

// Handle track ended
function handleTrackEnded() {
  if (repeatMode === 'one') {
    // Repeat the same track
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else if (repeatMode === 'all') {
    // Play next track, will loop around at the end
    playNextTrack();
  } else if (shuffleMode) {
    // Play random track
    playRandomTrack();
  } else {
    // Normal behavior - play next track
    // Check if we're at the end before playing next
    const isLastTrack = isPlaylistActive && currentPlaylistTracks.length > 0 ? 
      currentPlaylistTracks.indexOf(currentTrackIndex) === currentPlaylistTracks.length - 1 :
      currentTrackIndex === musicLibrary.length - 1;
      
    if (isLastTrack) {
      // Stop at the end if not in repeat mode
      audioPlayer.pause();
      isPlaying = false;
      playPauseBtn.innerHTML = '▶'; // Play symbol
    } else {
      playNextTrack();
    }
  }
}

// Play random track
function playRandomTrack() {
  const randomIndex = Math.floor(Math.random() * musicLibrary.length);
  currentTrackIndex = randomIndex;
  loadTrack(currentTrackIndex);
  if (isPlaying) {
    audioPlayer.play();
  }
}

// Play next track
function playNextTrack() {
  if (isPlaylistActive && currentPlaylistTracks.length > 0) {
    // Find the current track position in the playlist
    const currentPosition = currentPlaylistTracks.indexOf(currentTrackIndex);
    
    if (currentPosition !== -1) {
      // Move to next track in playlist, loop to beginning if at end
      const nextPosition = (currentPosition + 1) % currentPlaylistTracks.length;
      currentTrackIndex = currentPlaylistTracks[nextPosition];
    } else {
      // Current track not in playlist, just play the first track in playlist
      currentTrackIndex = currentPlaylistTracks[0];
    }
  } else {
    // Normal behavior - play next track in whole library
    currentTrackIndex = (currentTrackIndex + 1) % musicLibrary.length;
  }

  loadTrack(currentTrackIndex);
  if (isPlaying) {
    audioPlayer.play();
  }
}

// Play previous track
function playPrevTrack() {
  if (isPlaylistActive && currentPlaylistTracks.length > 0) {
    // Find the current track position in the playlist
    const currentPosition = currentPlaylistTracks.indexOf(currentTrackIndex);
    
    if (currentPosition !== -1) {
      // Move to previous track in playlist, loop to end if at beginning
      const prevPosition = (currentPosition - 1 + currentPlaylistTracks.length) % currentPlaylistTracks.length;
      currentTrackIndex = currentPlaylistTracks[prevPosition];
    } else {
      // Current track not in playlist, just play the last track in playlist
      currentTrackIndex = currentPlaylistTracks[currentPlaylistTracks.length - 1];
    }
  } else {
    // Normal behavior - play previous track in whole library
    currentTrackIndex = (currentTrackIndex - 1 + musicLibrary.length) % musicLibrary.length;
  }
  
  loadTrack(currentTrackIndex);
  if (isPlaying) {
    audioPlayer.play();
  }
}

// Menu button now handles menu toggling and back functionality
function handleMenuButton() {
  if (menuActive) {
    // Close the menu
    menuActive = false;
    menuOverlay.classList.remove('active');
  } else if (navigationHistory.length > 0) {
    // Go back to previous screen
    const previousScreen = navigationHistory.pop();
    showScreen(previousScreen.screen, previousScreen.data);
    if (previousScreen.listIndex !== undefined) {
      selectedListItem = previousScreen.listIndex;
      updateSelectedListItem();
    }
  } else {
    // Open the menu
    menuActive = true;
    menuOverlay.classList.add('active');
    updateSelectedMenuItem();
  }
}

// Update the selected menu item based on current screen
function updateSelectedMenuItem() {
  // Remove active class from all menu items
  menuItems.forEach(item => item.classList.remove('active'));
  
  // Find the corresponding menu item and make it active
  for (let i = 0; i < menuItems.length; i++) {
    const screenName = menuItems[i].getAttribute('data-screen');
    if (screenName === currentScreen) {
      selectedMenuItem = i;
      menuItems[i].classList.add('active');
      break;
    }
  }
}

// Update the selected list item
function updateSelectedListItem() {
  const listItems = document.querySelectorAll('.list-view li');
  if (listItems.length === 0) return;
  
  // Remove active class from all list items
  listItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to selected item
  if (selectedListItem >= listItems.length) {
    selectedListItem = listItems.length - 1;
  }
  
  if (selectedListItem >= 0 && selectedListItem < listItems.length) {
    listItems[selectedListItem].classList.add('active');
    
    // Scroll to ensure the selected item is visible
    listItems[selectedListItem].scrollIntoView({ block: 'nearest' });
  }
}

// Handle next button (depends on context)
function handleNextButton() {
  if (menuActive) {
    // Navigate down in menu
    menuItems[selectedMenuItem].classList.remove('active');
    selectedMenuItem = (selectedMenuItem + 1) % menuItems.length;
    menuItems[selectedMenuItem].classList.add('active');
  } else if (currentScreen === 'nowPlaying') {
    // When in Now Playing screen, directly control playback
    if (shuffleMode) {
      playRandomTrack();
    } else {
      playNextTrack();
    }
  } else if (document.querySelectorAll('.list-view li').length > 0) {
    // Navigate in list view
    const listItems = document.querySelectorAll('.list-view li');
    selectedListItem = (selectedListItem + 1) % listItems.length;
    updateSelectedListItem();
  }
}

// Handle prev button (depends on context)
function handlePrevButton() {
  if (menuActive) {
    // Navigate up in menu
    menuItems[selectedMenuItem].classList.remove('active');
    selectedMenuItem = (selectedMenuItem - 1 + menuItems.length) % menuItems.length;
    menuItems[selectedMenuItem].classList.add('active');
  } else if (currentScreen === 'nowPlaying') {
    // When in Now Playing screen, directly control playback
    playPrevTrack();
  } else if (document.querySelectorAll('.list-view li').length > 0) {
    // Navigate in list view
    const listItems = document.querySelectorAll('.list-view li');
    selectedListItem = (selectedListItem - 1 + listItems.length) % listItems.length;
    updateSelectedListItem();
  }
}

// Handle center button (depends on context)
function handleCenterButton() {
  if (menuActive) {
    // Select menu item
    selectMenuItem(selectedMenuItem);
  } else if (document.querySelectorAll('.list-view li').length > 0) {
    // Handle list item selection
    handleListItemSelection();
  } else {
    // Toggle play/pause
    togglePlayPause();
  }
}

// Handle list item selection based on current screen
function handleListItemSelection() {
  const listItems = document.querySelectorAll('.list-view li');
  if (selectedListItem < 0 || selectedListItem >= listItems.length) return;
  
  const selectedItem = listItems[selectedListItem].textContent;
  
  switch(currentScreen) {
    case 'artists':
      // Show artist's songs
      const artistTracks = musicLibrary.filter(track => track.artist === selectedItem);
      navigationHistory.push({ screen: 'artists', listIndex: selectedListItem });
      showScreen('artistDetail', { artist: selectedItem, tracks: artistTracks });
      break;
      
    case 'albums':
      // Show album's songs
      const albumTracks = musicLibrary.filter(track => track.album === selectedItem);
      navigationHistory.push({ screen: 'albums', listIndex: selectedListItem });
      // Store the indices of tracks in this album
      currentPlaylistTracks = albumTracks.map(track => 
        musicLibrary.findIndex(item => item.title === track.title && item.artist === track.artist)
      );
      
      showScreen('albumDetail', { album: selectedItem, tracks: albumTracks });
      break;
      
    case 'songs':
      // Play selected song
      const songIndex = musicLibrary.findIndex(track => 
        `${track.title} - ${track.artist}` === selectedItem
      );
      if (songIndex !== -1) {
        currentTrackIndex = songIndex;
        loadTrack(currentTrackIndex);
        isPlaying = true;
        audioPlayer.play();
        playPauseBtn.innerHTML = '||';
        showScreen('nowPlaying');
      }
      break;
      
    case 'playlists':
      // Show playlist songs
      const playlist = playlists.find(p => p.name === selectedItem);
      if (playlist) {
        const playlistTracks = playlist.tracks.map(index => musicLibrary[index]);
        navigationHistory.push({ screen: 'playlists', listIndex: selectedListItem });
        showScreen('playlistDetail', { name: selectedItem, tracks: playlistTracks, trackIndices: playlist.tracks });
      }
      break;
      
    case 'settings':
      // Handle settings options
      handleSettingsSelection(selectedItem);
      break;
      
    case 'artistDetail':
    case 'albumDetail':
    case 'playlistDetail':
      // Play the selected track
      const trackTitle = selectedItem.split(' - ')[0].trim();
      if (currentListItems[selectedListItem]) {
        // Play the selected song
        if (currentScreen === 'playlistDetail') {
          // For playlists we have the trackIndices available
          const data = document.getElementById(`${currentScreen}-view`).dataset;
          const playlistData = JSON.parse(data.playlistData);
          currentTrackIndex = playlistData.trackIndices[selectedListItem];
        } else {
          // For album/artist details, find the track in the library
          currentTrackIndex = musicLibrary.findIndex(track => track.title === trackTitle);
        }
        
        if (currentTrackIndex !== -1) {
          loadTrack(currentTrackIndex);
          isPlaying = true;
          audioPlayer.play();
          playPauseBtn.innerHTML = '||';
          showScreen('nowPlaying');
        }
      }
      break;
  }
}

// Handle settings selection
function handleSettingsSelection(selectedItem) {
  if (selectedItem.startsWith('Shuffle:')) {
    // Toggle shuffle mode
    shuffleMode = !shuffleMode;
    updateSettingsView();
  } else if (selectedItem.startsWith('Repeat:')) {
    // Cycle through repeat modes
    const modes = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    updateSettingsView();
  } else if (selectedItem.startsWith('Backlight:')) {
    // Cycle through backlight options
    const options = [15, 30, 60, 'Always On'];
    const currentOption = backlightTimeout === 'Always On' ? 
      'Always On' : backlightTimeout;
    const currentIndex = options.indexOf(currentOption);
    backlightTimeout = options[(currentIndex + 1) % options.length];
    updateSettingsView();
  } else if (selectedItem === 'Equalizer') {
    // Show equalizer screen (would be implemented in a real app)
    alert('Equalizer would be shown here');
  }
}

// Update settings view with current values
function updateSettingsView() {
  const settingsView = document.getElementById('settings-view');
  if (!settingsView) return;
  
  settingsView.innerHTML = `
    <h2>Settings</h2>
    <ul class="list-view">
      <li>Shuffle: ${shuffleMode ? 'On' : 'Off'}</li>
      <li>Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'}</li>
      <li>Equalizer</li>
      <li>Backlight: ${backlightTimeout === 'Always On' ? 'Always On' : `${backlightTimeout}s`}</li>
    </ul>
  `;
  
  // Restore selected item
  selectedListItem = 0;
  updateSelectedListItem();
}

// Select a menu item
function selectMenuItem(index) {
  const selectedScreen = menuItems[index].getAttribute('data-screen');
  console.log(`Selected menu item: ${menuItems[index].textContent} (${selectedScreen})`);
  
  // Close menu and show the selected screen
  menuActive = false;
  menuOverlay.classList.remove('active');
  
  // Show the selected screen
  showScreen(selectedScreen);
}

// Show a screen based on name and optional data
function showScreen(screenName, data) {
  // Hide all screens
  document.querySelectorAll('.screen-view').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Update current screen
  currentScreen = screenName;
  
  // Reset selected list item for new screens
  selectedListItem = 0;
  
  // Special screens with dynamic content
  if (screenName === 'artistDetail') {
    // Create or update artist detail view
    createArtistDetailView(data.artist, data.tracks);
  } else if (screenName === 'albumDetail') {
    // Create or update album detail view
    createAlbumDetailView(data.album, data.tracks);
  } else if (screenName === 'playlistDetail') {
    // Create or update playlist detail view
    createPlaylistDetailView(data.name, data.tracks, data.trackIndices);
  } else {
    // Regular screen
    const screenToShow = document.getElementById(`${screenName}-view`);
    if (screenToShow) {
      screenToShow.classList.add('active');
    } else {
      // Create the screen if it doesn't exist
      createScreenView(screenName);
      document.getElementById(`${screenName}-view`).classList.add('active');
    }
  }
  
  // Update current list items based on active screen
  updateCurrentListItems();
  
  // Update selected list item
  updateSelectedListItem();
}

// Update current list items based on active screen
function updateCurrentListItems() {
  const listItems = document.querySelectorAll('.list-view li');
  currentListItems = Array.from(listItems).map(item => item.textContent);
}

// Create artist detail view
function createArtistDetailView(artist, tracks) {
  let artistView = document.getElementById('artistDetail-view');
  
  if (!artistView) {
    artistView = document.createElement('div');
    artistView.id = 'artistDetail-view';
    artistView.className = 'screen-view';
    document.querySelector('.screen').appendChild(artistView);
  }
  
  artistView.innerHTML = `
    <h2>${artist}</h2>
    <ul class="list-view">
      ${tracks.map(track => `<li>${track.title} - ${track.album}</li>`).join('')}
    </ul>
  `;
  
  artistView.classList.add('active');
}

// Create album detail view
function createAlbumDetailView(album, tracks) {
  let albumView = document.getElementById('albumDetail-view');
  
  if (!albumView) {
    albumView = document.createElement('div');
    albumView.id = 'albumDetail-view';
    albumView.className = 'screen-view';
    document.querySelector('.screen').appendChild(albumView);
  }
  
  albumView.innerHTML = `
    <h2>${album}</h2>
    <ul class="list-view">
      ${tracks.map(track => `<li>${track.title} - ${track.artist}</li>`).join('')}
    </ul>
  `;
  
  albumView.classList.add('active');
}

// Create playlist detail view
function createPlaylistDetailView(name, tracks, trackIndices) {
  let playlistView = document.getElementById('playlistDetail-view');
  
  if (!playlistView) {
    playlistView = document.createElement('div');
    playlistView.id = 'playlistDetail-view';
    playlistView.className = 'screen-view';
    document.querySelector('.screen').appendChild(playlistView);
  }
  
  // Store the track indices as data attributes for later use
  playlistView.dataset.playlistData = JSON.stringify({ name, trackIndices });
  
  playlistView.innerHTML = `
    <h2>${name}</h2>
    <ul class="list-view">
      ${tracks.map(track => `<li>${track.title} - ${track.artist}</li>`).join('')}
    </ul>
  `;
  
  playlistView.classList.add('active');
}

// Update progress bar
function updateProgress() {
  const currentTime = audioPlayer.currentTime;
  const duration = audioPlayer.duration || 1;
  const progressPercent = (currentTime / duration) * 100;
  
  progressBar.style.width = `${progressPercent}%`;
  currentTimeEl.textContent = formatTime(currentTime);
}

// Format time from seconds to MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Create a screen view element
function createScreenView(screenName) {
  // Skip if this view already exists
  if (document.getElementById(`${screenName}-view`)) {
    return;
  }
  
  const screenView = document.createElement('div');
  screenView.id = `${screenName}-view`;
  screenView.className = 'screen-view';
  
  // Add content based on screen type
  switch(screenName) {
    case 'albums':
      // Get unique albums
      const albums = [...new Set(musicLibrary.map(track => track.album))];
      screenView.innerHTML = `
        <h2>Albums</h2>
        <ul class="list-view">
          ${albums.map(album => `<li>${album}</li>`).join('')}
        </ul>
      `;
      break;
    case 'artists':
      // Get unique artists
      const artists = [...new Set(musicLibrary.map(track => track.artist))];
      screenView.innerHTML = `
        <h2>Artists</h2>
        <ul class="list-view">
          ${artists.map(artist => `<li>${artist}</li>`).join('')}
        </ul>
      `;
      break;
    case 'songs':
      screenView.innerHTML = `
        <h2>Songs</h2>
        <ul class="list-view">
          ${musicLibrary.map(track => `<li>${track.title} - ${track.artist}</li>`).join('')}
        </ul>
      `;
      break;
    case 'playlists':
      screenView.innerHTML = `
        <h2>Playlists</h2>
        <ul class="list-view">
          ${playlists.map(playlist => `<li>${playlist.name}</li>`).join('')}
        </ul>
      `;
      break;
    case 'settings':
      screenView.innerHTML = `
        <h2>Settings</h2>
        <ul class="list-view">
          <li>Shuffle: ${shuffleMode ? 'On' : 'Off'}</li>
          <li>Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'one' ? 'One' : 'All'}</li>
          <li>Equalizer</li>
          <li>Backlight: ${backlightTimeout === 'Always On' ? 'Always On' : `${backlightTimeout}s`}</li>
        </ul>
      `;
      break;
    case 'nowPlaying':
      // Using the existing view for now playing
      return;
    default:
      screenView.innerHTML = `<h2>${screenName}</h2><p>Screen content</p>`;
      break;
  }
  
  // Add the screen view to the screen
  document.querySelector('.screen').appendChild(screenView);
  
  // Add click listeners to new list items
  addClickListenersToListItems();
}

// Add click event listeners to all list items
function addClickListenersToListItems() {
  const listItems = document.querySelectorAll('.list-view li');
  
  listItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      selectedListItem = index;
      updateSelectedListItem();
      handleListItemSelection();
    });
  });
}

function handleVolumeChange() {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  
  // Set audio volume (0 to 1)
  audioPlayer.volume = volumeSlider.value / 100;
  
  // Update volume display
  volumeValue.textContent = `${volumeSlider.value}%`;
  
  // Update volume icon based on level
  const volumeIcon = document.getElementById('volume-icon');
  if (parseInt(volumeSlider.value) === 0) {
    volumeIcon.textContent = '🔇';
  } else if (parseInt(volumeSlider.value) < 33) {
    volumeIcon.textContent = '🔈';
  } else if (parseInt(volumeSlider.value) < 66) {
    volumeIcon.textContent = '🔉';
  } else {
    volumeIcon.textContent = '🔊';
  }
}

// Initialize volume control
function initVolumeControl() {
  const volumeSlider = document.getElementById('volume-slider');
  
  // Set initial value
  volumeSlider.value = 100;
  audioPlayer.volume = 1;
  
  // Add event listener
  volumeSlider.addEventListener('input', handleVolumeChange);
  
  // Trigger initial update
  handleVolumeChange();
}

// Setup observer to detect when new list items are added to the DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain list items
      mutation.addedNodes.forEach((node) => {
        if (node.querySelectorAll) {
          const listItems = node.querySelectorAll('.list-view li');
          if (listItems.length > 0) {
            // Add click listeners to these new list items
            listItems.forEach((item, index) => {
              item.addEventListener('click', () => {
                selectedListItem = index;
                updateSelectedListItem();
                handleListItemSelection();
              });
            });
          }
        }
      });
    }
  });
});

// Start observing the screen element for added list items
observer.observe(document.querySelector('.screen'), {
  childList: true,
  subtree: true
});

// Start the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initPlayer();
  initVolumeControl();
  
  // Add keyboard controls for testing in browser
  document.addEventListener('keydown', (e) => {
    switch(e.key) {
      case ' ':
        handleCenterButton();
        break;
      case 'ArrowUp':
        handlePrevButton();
        break;
      case 'ArrowDown':
        handleNextButton();
        break;
      case 'Escape':
      case 'Backspace':
        handleMenuButton();
        break;
    }
  });
});