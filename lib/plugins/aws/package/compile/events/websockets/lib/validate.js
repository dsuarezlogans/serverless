'use strict';

const _ = require('lodash');

module.exports = {
  validate() {
    const events = [];

    const getAuthorizerNameFromArn = arn => {
      const splitArn = arn.split(':');
      return splitArn[splitArn.length - 1];
    };

    Object.entries(this.serverless.service.functions).forEach(([functionName, functionObject]) => {
      functionObject.events.forEach(event => {
        if (event.websocket) {
          // dealing with the extended object definition
          if (_.isObject(event.websocket)) {
            const websocketObj = {
              functionName,
              route: event.websocket.route,
            };

            // route response
            if (event.websocket.routeResponseSelectionExpression) {
              websocketObj.routeResponseSelectionExpression =
                event.websocket.routeResponseSelectionExpression;
            }

            // authorizers
            if (typeof event.websocket.authorizer === 'string') {
              if (event.websocket.authorizer.includes(':')) {
                // arn
                websocketObj.authorizer = {
                  name: getAuthorizerNameFromArn(event.websocket.authorizer),
                  uri: {
                    'Fn::Join': [
                      '',
                      [
                        'arn:',
                        { Ref: 'AWS::Partition' },
                        ':apigateway:',
                        { Ref: 'AWS::Region' },
                        ':lambda:path/2015-03-31/functions/',
                        event.websocket.authorizer,
                        '/invocations',
                      ],
                    ],
                  },
                  identitySource: ['route.request.header.Auth'],
                  permission: event.websocket.authorizer,
                };
              } else {
                // reference function
                const lambdaLogicalId = this.provider.naming.getLambdaLogicalId(
                  event.websocket.authorizer
                );
                websocketObj.authorizer = {
                  name: event.websocket.authorizer,
                  uri: {
                    'Fn::Join': [
                      '',
                      [
                        'arn:',
                        { Ref: 'AWS::Partition' },
                        ':apigateway:',
                        { Ref: 'AWS::Region' },
                        ':lambda:path/2015-03-31/functions/',
                        { 'Fn::GetAtt': [lambdaLogicalId, 'Arn'] },
                        '/invocations',
                      ],
                    ],
                  },
                  identitySource: ['route.request.header.Auth'],
                  permission: lambdaLogicalId,
                };
              }
            } else if (_.isObject(event.websocket.authorizer)) {
              websocketObj.authorizer = {};
              if (event.websocket.authorizer.arn) {
                websocketObj.authorizer.name = getAuthorizerNameFromArn(
                  event.websocket.authorizer.arn
                );
                websocketObj.authorizer.uri = {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      { Ref: 'AWS::Partition' },
                      ':apigateway:',
                      { Ref: 'AWS::Region' },
                      ':lambda:path/2015-03-31/functions/',
                      event.websocket.authorizer.arn,
                      '/invocations',
                    ],
                  ],
                };
                websocketObj.authorizer.permission = event.websocket.authorizer.arn;
              } else if (event.websocket.authorizer.name) {
                websocketObj.authorizer.name = event.websocket.authorizer.name;
                const lambdaLogicalId = this.provider.naming.getLambdaLogicalId(
                  event.websocket.authorizer.name
                );
                websocketObj.authorizer.uri = {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      { Ref: 'AWS::Partition' },
                      ':apigateway:',
                      { Ref: 'AWS::Region' },
                      ':lambda:path/2015-03-31/functions/',
                      { 'Fn::GetAtt': [lambdaLogicalId, 'Arn'] },
                      '/invocations',
                    ],
                  ],
                };
                websocketObj.authorizer.permission = lambdaLogicalId;
              }

              if (!event.websocket.authorizer.identitySource) {
                websocketObj.authorizer.identitySource = ['route.request.header.Auth'];
              } else {
                websocketObj.authorizer.identitySource = event.websocket.authorizer.identitySource;
              }
            }
            events.push(websocketObj);
            // dealing with the simplified string representation
          } else if (typeof event.websocket === 'string') {
            events.push({
              functionName,
              route: event.websocket,
            });
          }
        }
      });
    });

    return {
      events,
    };
  },
};
