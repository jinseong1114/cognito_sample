import React, { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Config_info } from '../apiconfig'


const AWS = require('aws-sdk');

var apigClientFactory = require("aws-api-gateway-client").default;
AWS.config.region = Config_info.region
const identityPoolId = Config_info.identity_pool_id
const apiUrl = Config_info.apiUrl

export default function Contents(props) {

  const tenant_id = props.tenant_id

  const [rows, setRows] = useState('')
  const [jwtToken, setJwtToken] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    const url = new URL(apiUrl), params = { 'tenant_id': tenant_id }
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
    setUrl(url)

  }, [])

  function createData(year, role, tenure, salary) {
    return { year, role, tenure, salary };
  }

  async function getUserCredentials() {
    try {
      const session = await Auth.currentSession();
      const jwtToken = session.getIdToken().getJwtToken();
      setJwtToken(jwtToken)
      console.log(jwtToken)
      AWS.config.credentials = await new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId,
        Logins: {
          #CognitoInfo: jwtToken
        }

      });
    } catch (error) {
      console.log(error)
      return null;
    }
  }

  if (rows == null || rows == '') {
    AWS.config.getCredentials(function (err) {

      if (err) {
        getUserCredentials()
        console.log('error', err);
      } else {

        console.log('success')

        const accessKeyId = AWS.config.credentials.accessKeyId
        const secretAccessKey = AWS.config.credentials.secretAccessKey
        const sessionToken = AWS.config.credentials.sessionToken

        const apigClient = apigClientFactory.newClient({
          region: AWS.config.region,
          invokeUrl: apiUrl,
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
          sessionToken: sessionToken,
        });

        const pathTemplate = '';
        const method = 'POST';
        const additionalParams = {
          queryParams: {
            tenant_id: props.email,
            Authorization: jwtToken,
            Identity_id: AWS.config.credentials.webIdentityCredentials.params.IdentityId,
            IdentityPoolId: identityPoolId,
            IdentityPool_login: #CognitoInfo
          }
        };

        apigClient.invokeApi({}, pathTemplate, method, additionalParams, {})
          .then(response => {
            var year = response.data.year
            var role = response.data.role
            var tenure = response.data.tenure
            var salary = response.data.salary
            var temp = [createData(year, role, tenure, salary)]
            setRows(temp);
          })
          .catch(error => {
            console.error('api error', error);
          });
      }
    });
  }
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 200, }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="center">연도 </TableCell>
            <TableCell align="center">직급</TableCell>
            <TableCell align="center">연차</TableCell>
            <TableCell align="center">연봉</TableCell>
          </TableRow>
        </TableHead>
        {rows !== '' &&
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.name}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell align="center">{row.year}</TableCell>
                <TableCell align="center">{row.role}</TableCell>
                <TableCell align="center">{row.tenure}</TableCell>
                <TableCell align="center">{row.salary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        }
      </Table>
    </TableContainer>
  );
}