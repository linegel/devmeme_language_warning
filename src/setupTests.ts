// This file will be imported by Jest to set up the test environment
// Instead of importing @types/jest, we'll declare global variables that Jest adds

// Make sure Jest's globals are recognized by TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add any custom matchers if needed
    }
  }
}

// Add an export to make this file a module
export {}; 