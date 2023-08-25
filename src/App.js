import './App.css';
import { React } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import SideBar from './components/SideBar';
import { Amplify } from "aws-amplify";
import { Authenticator, useTheme, View, Image, TextField } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './awsconfig';
import penguin from "./images/penguin-logo.jpeg"
import { Auth } from 'aws-amplify';
import uuid from 'react-uuid'

Amplify.configure(awsExports);

const components = {
  Header() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Image
          alt="Amplify logo"
          src={penguin}
          height="30%"
          width="45%"
          onClick={() => alert(' 🐧 :: ? ')}
        />
      </View>
    );
  },
};

const services = {
  async handleSignUp(formData) {
    const ec2_option = document.getElementsByName("ec2_option")[0].value;
    let { username, password, attributes } = formData;

    return Auth.signUp({
      username,
      password,
      attributes: {
        'custom:tenant_id': uuid(),
        'custom:ec2_option': ec2_option,
        //'given_name':attributes.given_name,
      },
      autoSignIn: {
        enabled: true,
      },
    });
  },
}


export default function App() {


  const formFields = {
    signIn: {
      username: {
        placeholder: 'Enter your email',
      },
    },
    signUp: {
      username: {
        placeholder: 'Enter your email',
        order: 1
      },

      password: {
        label: 'Password',
        placeholder: 'Enter your Password',
        order: 2,
      },
      confirm_password: {
        label: 'Confirm Password',
        order: 3,
      },
      ec2_option: {
        label: 'EC2 Option',
        order: 8,
      },
    }
  }
  return (
    <Authenticator services={services} formFields={formFields} components={components}>
      {({ user }) => (
        <div className="App">
          <Routes>
            <Route path="/" element={<SideBar user={user} username={user.username} />} />
          </Routes>
        </div>
      )}

    </Authenticator>
  );
}

