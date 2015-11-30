
var AWS = require('aws-sdk');
var CfnLambda = require('cfn-lambda');

var APIG = new AWS.APIGateway({apiVersion: '2015-07-09'});


exports.handler = CfnLambda({
  Create: Create,
  Update: Update,
  Delete: Delete,
  NoUpdate: NoUpdate,
  SchemaPath: [__dirname, 'schema.json'],
  TriggersReplacement: [
    'RestApiId',
    'Name',
    'ContentType'
  ]
});


function Create(params, reply) {
  var newParams = clone(params);
  newParams.Schema = 'string' === typeof params.Schema
    ? params.Schema
    : JSON.stringify(params.Schema);
  CfnLambda.SDKAlias({
    api: APIG,
    method: 'createModel',
    returnPhysicalId: function() {
      return [
        params.RestApiId,
        params.Name,
        params.ContentType
      ].join(':');
    },
    downcase: true,
    returnAttrs: function() {
      return {
        SchemaString: newParams.Schema
      };
    }
  })(newParams, reply);
}

function Update(physicalId, params, oldParams, reply) {
  console.log('Updating model %s description ' +
    'to be: %s', physicalId, params.Description);
  var stringSchema = 'string' === typeof params.Schema
    ? params.Schema
    : JSON.stringify(params.Schema);
  var updateParams = {
    restApiId: params.RestApiId,
    modelName: params.Name,
    patchOperations: [
      {
        op: 'replace',
        path: '/description',
        value: params.Description || ''
      },
      {
        op: 'replace',
        path: '/schema',
        value: stringSchema
      }
    ]
  };
  console.log('Sending updateModel to %s using ' +
    'values: %j', physicalId, updateParams);
  APIG.updateModel(updateParams, function(updateErr, updateData) {
    if (updateErr) {
      console.error('Failed to update model %s: %j', physicalId, updateErr);
      return reply(updateErr.message || ('UNKNOWN_FATAL: ' + updateErr.code));
    }
    console.log('Successfully updated! %j', updateData);
    reply(null, physicalId, {
      SchemaString: stringSchema
    });
  });
}

function Delete(physicalId, params, reply) {
  CfnLambda.SDKAlias({
    api: APIG,
    method: 'deleteModel',
    returnPhysicalId: function() {
      return [
        params.RestApiId,
        params.Name,
        params.ContentType
      ].join(':');
    },
    downcase: true,
    ignoreErrorCodes: [404]
  })(physicalId, {
    ModelName: params.Name,
    RestApiId: params.RestApiId
  }, reply);
}

function NoUpdate(physicalId, params, reply) {
  console.log('Found a NoUpdate on %s, replying to ' +
    'include SchemaString Attr: %j', physicalId, params);
  return reply(null, physicalId, {
    SchemaString: 'string' === typeof params.Schema
      ? params.Schema
      : JSON.stringify(params.Schema)
  });
}

function clone(json) {
  return JSON.parse(JSON.stringify(json));
}
