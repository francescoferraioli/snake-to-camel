const { camelCase } = require('lodash');

function isSnakeCase(name) {
  // Check for snake_case pattern: all lowercase with underscores
  return /^[a-z]+(_[a-z0-9]+)*$/.test(name);
}

function toCamelCase(name) {
  return camelCase(name);
}

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Rename variable declarations
  root.find(j.Identifier)
    .forEach(path => {
      const { name } = path.node;
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
