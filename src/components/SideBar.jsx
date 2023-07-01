import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { Auth } from 'aws-amplify';
import Contents from './Contents';

const drawerWidth = 240;
const AWS = require('aws-sdk');

export default function SideBar(props) {

  const tenant_id = props.user.attributes['custom:tenant_id']

  const email = props.user.attributes['email']

  async function signOut() {
    try {
      await Auth.signOut({ global: true });
    } catch (error) {
      console.log('error signing out: ', error);
    }
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="a" href="/" sx={{
            mr: 2,
            display: { xs: 'none', md: 'flex' },
            letterSpacing: '.2rem',
            color: 'inherit',
            textDecoration: 'none',
          }}>
            Your Salary
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Divider />
        <List>
          <ListItemButton href='/'><ListItemText primary='Dashboard' /></ListItemButton>
          <ListItemButton onClick={signOut}><ListItemText primary='Sign out' /></ListItemButton>
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        <Toolbar />
        <Contents tenant_id={tenant_id} user={props.username} email={email} />
      </Box>
    </Box>
  );
}