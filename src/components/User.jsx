import React from 'react';
import penguin from '../images/penguin-logo.jpeg';
import { Image } from '@aws-amplify/ui-react';

function User() {
  return (
    <div className="App">
        <Image
          alt="Amplify logo"
          src={penguin}
          height="30%"
          width="45%"
          onClick={() => alert(' 🐧 :: ? ')}
        />
    </div>
  );
}

export default User;