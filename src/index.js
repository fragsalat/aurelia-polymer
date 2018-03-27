import {EventManager} from 'aurelia-framework';
import {TemplatingBindingLanguage} from 'aurelia-templating-binding';
import * as LogManager from 'aurelia-logging';
import { AuSelectCustomAttribute } from './au-select-custom-attribute';

const logger = LogManager.getLogger('polymer');

export function configure(aurelia) {
  logger.info('Initializing aurelia-polymer');

  aurelia.globalResources('./au-select-custom-attribute');

  if (!('Polymer' in window)) {
    logger.error('Polymer is not loaded');
    return;
  }

  let eventManager = aurelia.container.get(EventManager);
  let bindingLanguage = aurelia.container.get(TemplatingBindingLanguage);
  // let observerLocator = aurelia.container.get(ObserverLocator);

  bindingLanguage.attributeMap['bind-value'] = 'bindValue';

  logger.debug('Performing initial Polymer binding');

  if (Polymer.version.substr(1) === '1') {
    handleV1(eventManager);
  } else {
    handleV2(eventManager);
  }
}

function handleV1(eventManager) {
  let registrations = Polymer.telemetry.registrations;
  registrations.forEach(prototype => registerElement(eventManager, prototype));

  let oldRegistrate = Polymer.telemetry._registrate.bind(Polymer.telemetry);

  Polymer.telemetry._registrate = prototype => {
    oldRegistrate(prototype);
    registerElement(eventManager, prototype);
  };
}

function handleV2(eventManager) {
  var registrations = Polymer.telemetry.registrations;
  registrations.forEach(prototype => {
    return registerElement(eventManager, prototype);
  });

  var oldRegistrate = Polymer.telemetry.register.bind(Polymer.telemetry);

  Polymer.telemetry.register = function (prototype) {
    oldRegistrate(prototype);
    registerElement(eventManager, prototype);
  };
}

function registerElement(eventManager, prototype) {
  // TODO: general override mechanism for specific Polymer elements and behaviors
  // TODO: need to map element/behavior name + properties => events
  logger.debug(`Registering configuration for Polymer element ["${prototype.is}]`);

  eventManager.registerElementConfig({
    tagName: prototype.is,
    properties: Polymer.version.substr(1) === '1' ? getPolymerV1Props(prototype) : getPolymerV2Props(prototype)
  });
}

function getPolymerV1Props(prototype) {
  let propertyConfig = {'bind-value': ['change', 'input']}; // Not explicitly listed for all elements that use it

  function handleProp(propName, prop) {
    if (prop.notify) {
      propertyConfig[propName] = [`${propName}-changed`, 'change', 'input'];
    }
  }

  Object.keys(prototype.properties)
    .forEach(propName => 
      handleProp(propName, prototype.properties[propName]
    ));

  prototype.behaviors.forEach(behavior => {
    if (typeof behavior.properties !== 'undefined') {
      Object.keys(behavior.properties)
        .forEach(propName => handleProp(propName, behavior.properties[propName]));
    }

    if (Polymer.IronSelectableBehavior && behavior === Polymer.IronSelectableBehavior) {
      propertyConfig.selected = ['iron-select', 'iron-deselect', 'iron-items-changed'];
    }
  });

  return propertyConfig;
}

function getPolymerV2Props(prototype) {
  var propertyConfig = { 'bind-value': ['change', 'input'] };

  if (prototype.__notifyEffects) {
    Object.keys(prototype.__notifyEffects).forEach(function (propName) {
      propertyConfig[propName] = [propName + '-changed', 'change', 'input'];
    });
  }

  return propertyConfig;
}
