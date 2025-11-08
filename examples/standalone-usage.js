/**
 * Example: Standalone usage of CompactLogger
 *
 * Use this when you want to log custom events, runtime errors,
 * or any failures outside of a test framework.
 */

import { CompactLogger } from '../src/compact-logger.js';

async function main() {
  // Create logger instance
  const logger = new CompactLogger({
    outputDir: './debug',
    metadata: {
      environment: 'production',
      version: '1.0.0',
      session: 'abc123'
    }
  });

  // Example 1: Log a validation failure
  logger.logFailure({
    name: 'User registration validation',
    location: {
      file: 'services/auth.js',
      line: 142
    },
    error: {
      type: 'ValidationError',
      message: 'Email format invalid',
      expected: 'valid email format',
      actual: 'user@invalid'
    },
    context: {
      userId: 'user-123',
      ip: '192.168.1.1'
    }
  });

  // Example 2: Log an API failure
  logger.logFailure({
    name: 'API request to /api/users',
    location: {
      file: 'api/users.js',
      line: 67
    },
    error: {
      type: 'HTTPError',
      message: 'Request failed with status 500',
      expected: '200 OK',
      actual: '500 Internal Server Error',
      stack: 'at fetch (api/users.js:67:12)\n  at handler (api/users.js:45:8)'
    }
  });

  // Example 3: Log a successful check
  logger.logPass({
    name: 'Database connection check',
    location: {
      file: 'db/connection.js',
      line: 23
    },
    duration: 150
  });

  // Finalize and write reports
  const result = await logger.finalize();

  console.log('\n✅ Reports generated:');
  console.log(`   Full report: ${result.fullPath} (~${result.fullTokens} tokens)`);
  console.log(`   Compact: ${result.compactPath} (~${result.compactTokens} tokens)`);
  console.log(`   Failures: ${result.failures}, Passes: ${result.passes}`);
}

main().catch(console.error);
