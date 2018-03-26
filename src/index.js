import {EventManager} from 'aurelia-framework';
import {TemplatingBindingLanguage} from 'aurelia-templating-binding';
import * as LogManager from 'aurelia-logging';
import { AuSelectCustomAttribute } from './au-select-custom-attribute';

const logger = LogManager.getLogger('polymer');

function registerElementV1(eventManager, bindingLanguage, prototype) {
  let propertyConfig = {'bind-value': ['change', 'input']}; // Not explicitly listed for all elements that use it

  function handleProp(propName, prop) {
    if (prop.notify) {
      propertyConfig[propName] = [`${propName}-changed`, 'change', 'input'];
    }
  }

  Object.keys(prototype.properties)
    .forEach(propName => handleProp(propName, prototype.properties[propName]));

  prototype.behaviors.forEach(behavior => {
    if (typeof behavior.properties !== 'undefined') {
      Object.keys(behavior.properties)
        .forEach(propName => handleProp(propName, behavior.properties[propName]));
    }

    if (Polymer.IronSelectableBehavior && behavior === Polymer.IronSelectableBehavior) {
      propertyConfig.selected = ['iron-select', 'iron-deselect', 'iron-items-changed'];
    }
  });

  // TODO: general override mechanism for specific Polymer elements and behaviors
  // TODO: need to map element/behavior name + properties => events

  logger.debug(`Registering configuration for Polymer element ["${prototype.is}]`);

  eventManager.registerElementConfig({
    tagName: prototype.is,
    properties: propertyConfig
  });
}

function handleV1() {
  let registrations = Polymer.telemetry.registrations;
  registrations.forEach(prototype => registerElementV1(eventManager, bindingLanguage, prototype));

  let oldRegistrate = Polymer.telemetry._registrate.bind(Polymer.telemetry);

  Polymer.telemetry._registrate = prototype => {
    oldRegistrate(prototype);
    registerElementV1(eventManager, bindingLanguage, prototype);
  };
}

function registerElementV2(eventManager, bindingLanguage, prototype) {
  var propertyConfig = { 'bind-value': ['change', 'input'] };

  if (prototype.__notifyEffects) {
    Object.keys(prototype.__notifyEffects).forEach(function (propName) {
      propertyConfig[propName] = [propName + '-changed', 'change', 'input'];
    });
  }

  logger.debug('Registering configuration for Polymer element ["' + prototype.is + ']');

  eventManager.registerElementConfig({
    tagName: prototype.constructor.is,
    properties: propertyConfig
  });
}

function handleV2() {
  var registrations = Polymer.telemetry.registrations;
  registrations.forEach(prototype => {
    return registerElementV2(eventManager, bindingLanguage, prototype);
  });

  var oldRegistrate = Polymer.telemetry.register.bind(Polymer.telemetry);

  Polymer.telemetry.register = function (prototype) {
    oldRegistrate(prototype);
    registerElementV2(eventManager, bindingLanguage, prototype);
  };
}

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
    handleV1();
  } else {
    handleV2();
  }
}
