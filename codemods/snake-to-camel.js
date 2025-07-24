const { camelCase } = require('lodash');

function isSnakeCase(name) {
  return /_/.test(name);
}

function toCamelCase(name) {
  return camelCase(name);
}

console.log('snake-to-camel.js');
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  console.log(root);

  // Rename variable declarations
  root.find(j.Identifier)
    .forEach(path => {
      const { name } = path.node;
      console.log(name);
      if (isSnakeCase(name)) {
        const camel = toCamelCase(name);
        // Only rename if not already camelCase
        if (camel !== name) {
          path.node.name = camel;
        }
      }
    });

  return root.toSource();
};

module.exports.parser = 'tsx';
