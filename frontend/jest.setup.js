require("jest-preset-angular");

const { Crypto } = require("@peculiar/webcrypto");
const util = require("util");

global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;
global.crypto = new Crypto();

// All below taken from
// https://github.com/thymikee/jest-preset-angular/blob/6c95f8c5737a7fa476d74e5b80931e32149c5c6b/e2e/test-app-v9/jest-global-mocks.ts

Object.defineProperty(window, "CSS", { value: null });
Object.defineProperty(document, "doctype", {
  value: "<!DOCTYPE html>",
});
Object.defineProperty(window, "getComputedStyle", {
  value: () => {
    return {
      display: "none",
      appearance: ["-webkit-appearance"],
    };
  },
});
/**
 * ISSUE: https://github.com/angular/material2/issues/7101
 * Workaround for JSDOM missing transform property
 */
Object.defineProperty(document.body.style, "transform", {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});
