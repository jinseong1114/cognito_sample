data "aws_iam_policy_document" "instance_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
            type = "Federated"
            identifiers = ["cognito-identity.amazonaws.com"]
		}
  }

  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "saas_lambda_role" {
    name               = "saas_lambda_role"
    assume_role_policy = data.aws_iam_policy_document.instance_assume_role_policy.json

    inline_policy{
            name = "my-inline"
            policy = jsonencode({
            Version   = "2012-10-17"
            Statement = [
                {
                "Effect": "Allow",
                "Action": [
                "cognito-identity:GetOpenIdTokenForDeveloperIdentity",
                "cognito-identity:GetIdentityPoolRoles"
                ],
                "Resource": [
                "*"
                ]
                }
            ]
            })
    }
}

resource "aws_iam_role_policy_attachment" "saas_lambda_role_attach" {
  role       = "${aws_iam_role.saas_lambda_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


data "archive_file" "lambda" {
  type        = "zip"
  source_file = "lambda_function.py"
  output_path = "saas_lambda.zip"
}


resource "aws_lambda_function" "saas_lambda" {
  function_name = "saas_lambda_function"  
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.8"
  memory_size   = 128
  timeout       = 10
  role          = aws_iam_role.saas_lambda_role.arn
  filename      = "saas_lambda.zip"
  source_code_hash = data.archive_file.lambda.output_base64sha256
}


resource "aws_api_gateway_rest_api" "saas_api" {
  name        = "saas_api"  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "MySaaSResource" {
  rest_api_id = aws_api_gateway_rest_api.saas_api.id
  parent_id   = aws_api_gateway_rest_api.saas_api.root_resource_id
  path_part   = "service"
}

resource "aws_api_gateway_method" "options_method" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "OPTIONS"
    authorization = "NONE"
}


resource "aws_api_gateway_method" "saas_method" {
  rest_api_id   = aws_api_gateway_rest_api.saas_api.id
  resource_id   = aws_api_gateway_resource.MySaaSResource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "options_200" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "${aws_api_gateway_method.options_method.http_method}"
    status_code   = "200"
    response_models = {
        "application/json" = "Empty"
    }
    response_parameters = {
        "method.response.header.Access-Control-Allow-Headers" = true,
        "method.response.header.Access-Control-Allow-Methods" = true,
        "method.response.header.Access-Control-Allow-Origin" = true
    }
    depends_on = [aws_api_gateway_method.options_method]
}

resource "aws_api_gateway_integration" "options_integration" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "${aws_api_gateway_method.options_method.http_method}"
    type          = "MOCK"
    depends_on = [aws_api_gateway_method.options_method]
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "${aws_api_gateway_method.options_method.http_method}"
    status_code   = "${aws_api_gateway_method_response.options_200.status_code}"
    response_parameters = {
        "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT'",
        "method.response.header.Access-Control-Allow-Origin" = "'*'"
    }
    depends_on = [aws_api_gateway_method_response.options_200]
}


resource "aws_api_gateway_method_response" "saas_method_response_200" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "${aws_api_gateway_method.saas_method.http_method}"
    status_code   = "200"
    response_parameters = {
        "method.response.header.Access-Control-Allow-Origin" = true
    }
    response_models = {
        "application/json" = "Empty"
    }
    depends_on = [aws_api_gateway_method.saas_method]
}

resource "aws_api_gateway_integration" "saas_integration" {
  rest_api_id             = aws_api_gateway_rest_api.saas_api.id
  resource_id             = aws_api_gateway_resource.MySaaSResource.id
  http_method             = aws_api_gateway_method.saas_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.saas_lambda.invoke_arn
  depends_on = [aws_api_gateway_method.saas_method]
}

resource "aws_api_gateway_integration_response" "saas_integration_response" {
    rest_api_id   = "${aws_api_gateway_rest_api.saas_api.id}"
    resource_id   = aws_api_gateway_resource.MySaaSResource.id
    http_method   = "${aws_api_gateway_method.saas_method.http_method}"
    status_code   = "200"
    response_templates = {
       "application/json" = "Empty"
    } 
    depends_on = [
    aws_lambda_function.saas_lambda,
    aws_api_gateway_integration.saas_integration,
    aws_api_gateway_method_response.saas_method_response_200
  ]
}

resource "aws_api_gateway_deployment" "saas_deployment" {
  rest_api_id = aws_api_gateway_rest_api.saas_api.id
  stage_name  = "prod"  
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_method.saas_method.id,
      aws_api_gateway_integration.saas_integration.id,
    ]))
  }
}

resource "aws_lambda_permission" "apigw_lambda" {
    statement_id  = "AllowExecutionFromAPIGateway"
    action        = "lambda:InvokeFunction"
    function_name =  "saas_lambda_function"
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_api_gateway_rest_api.saas_api.execution_arn}/*"
    depends_on = [aws_lambda_function.saas_lambda]
}
