import { useState, useEffect } from 'react';
import { getUsername, saveUsername } from '@/lib/gemini';

export default function useUsername() {
  const [username, setUsername] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    // Check if username exists in local storage
    const storedUsername = getUsername();
    
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      setShowModal(true);
    }
  }, []);

  const handleUsernameSubmit = (newUsername: string) => {
    if (newUsername.length < 2 || newUsername.length > 15) {
      return false;
    }
    
    saveUsername(newUsername);
    setUsername(newUsername);
    setShowModal(false);
    return true;
  };

  return {
    username,
    showModal,
    handleUsernameSubmit
  };
}
