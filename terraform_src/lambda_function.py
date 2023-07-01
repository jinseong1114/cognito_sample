import json
import boto3
from boto3.dynamodb.conditions import Key
import os

boto3.setup_default_session(region_name='us-east-1')

def lambda_handler(event, context):
    
    client= boto3.client('cognito-identity')
    
    aws_account_id = context.invoked_function_arn.split(":")[4]
    
    parameters = event['queryStringParameters']

    role_name = client.get_identity_pool_roles(
        IdentityPoolId=parameters['IdentityPoolId']
    )['Roles']['authenticated']
    
    print(parameters)

    response = client.get_open_id_token_for_developer_identity(
        IdentityPoolId=parameters['IdentityPoolId'],
        IdentityId=parameters['Identity_id'],
        Logins={
            parameters['IdentityPool_login']: parameters['Authorization']
        },
    )
    
    sts_client = boto3.client('sts')

    scoped_policy= {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "penguin",
                    "Effect": "Allow",
                    "Action": "dynamodb:Query",
                    "Resource": "arn:aws:dynamodb:us-east-1:{aws_account_id}:table/penguin-db",
                    "Condition": {
        		        "ForAllValues:StringEquals": {
        			        "dynamodb:LeadingKeys": "{key}"
        		        }
            	    }
                }
                        ]
              }
    
    policy = json.dumps(scoped_policy).replace("{key}",event["queryStringParameters"]["tenant_id"]).replace("{aws_account_id}",aws_account_id)
    
    response = sts_client.assume_role_with_web_identity(
                       RoleArn=role_name,
                       RoleSessionName='ddd',
                       WebIdentityToken=response['Token'],
                       Policy=policy
    )
    
    dynamodb = boto3.resource(
        'dynamodb',
        region_name="us-east-1",
        aws_access_key_id=response['Credentials']['AccessKeyId'],
        aws_secret_access_key=response['Credentials']['SecretAccessKey'],
        aws_session_token=response['Credentials']['SessionToken'],
    )

    table = dynamodb.Table('penguin-db')
    
    try:
        query = {"KeyConditionExpression": Key('tenant_id').eq(event['queryStringParameters']['tenant_id'])}
        data = table.query(**query)['Items']
    except Exception as e:
        data = [str(e)]
        print(e)
    
    return {
        'statusCode': 200,
       'headers': {
           "Content-Type" : "application/json",
            "Access-Control-Allow-Origin" : "*",
        },
        'body':json.dumps(data[0])
    }