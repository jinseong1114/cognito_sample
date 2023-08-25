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

  function createData(ec2Option, exparedDate, vpcName) {
    return { ec2Option, exparedDate, vpcName };
  }

  async function getUserCredentials() {
    try {
      console.log('getUserCredentials')
      const session = await Auth.currentSession();
      console.log(session)
      const getJwtToken = session.getIdToken().getJwtToken();
      setJwtToken(getJwtToken)
      console.log(jwtToken)
      AWS.config.credentials = await new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId,
        Logins: {
          "cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_oOlLpuler": jwtToken
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
            IdentityPool_login: "cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_oOlLpuler"
          }
        };

        console.log('additionalParams:', additionalParams)

        apigClient.invokeApi({}, pathTemplate, method, additionalParams, {})
          .then(response => {
            console.log(response)
            var ec2Option = response.data.ec2_option
            var exparedDate = response.data.expired_date
            var vpcName = response.data.vpc_name
            var temp = [createData(ec2Option, exparedDate, vpcName)]
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
            <TableCell align="center">옵션 </TableCell>
            <TableCell align="center">만료일</TableCell>
            <TableCell align="center">VPC</TableCell>
          </TableRow>
        </TableHead>
        {rows !== '' &&
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.name}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell align="center">{row.ec2Option}</TableCell>
                <TableCell align="center">{row.exparedDate}</TableCell>
                <TableCell align="center">{row.vpcName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        }
      </Table>
    </TableContainer>
  );
}