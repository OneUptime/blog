# How to Debug Node.js Applications with Chrome DevTools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Debugging, ChromeDevTools, JavaScript, Performance

Description: Learn how to debug Node.js applications using Chrome DevTools including setting breakpoints, inspecting variables, profiling performance, and analyzing memory usage.

---

Chrome DevTools is not just for browser debugging. You can use it to debug Node.js applications with a powerful graphical interface featuring breakpoints, step-through execution, memory profiling, and performance analysis.

## Starting the Debugger

### Basic Debug Mode

```bash
# Start Node.js in debug mode
node --inspect app.js

# With a specific port
node --inspect=9230 app.js

# Break on first line of code
node --inspect-brk app.js
```

### Opening Chrome DevTools

1. Open Chrome browser
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"

Or use the direct link: `chrome://inspect/#devices`

You will see your Node.js process listed under "Remote Target".

## Setting Breakpoints

### In Chrome DevTools

1. Click on the **Sources** tab
2. Find your file in the file tree (left panel)
3. Click on a line number to set a breakpoint

### In Code (debugger statement)

```javascript
// server.js
const express = require('express');
const app = express();

app.get('/users', (req, res) => {
  const users = getUsers();
  
  // Execution will pause here
  debugger;
  
  res.json(users);
});
```

### Conditional Breakpoints

Right-click on a line number and select "Add conditional breakpoint":

```javascript
// Break only when userId is 5
users.forEach(user => {
  // Right-click line below, add condition: user.id === 5
  processUser(user);
});
```

## Debugging Workflow

### Step Controls

When paused at a breakpoint:

- **Resume (F8)**: Continue execution until next breakpoint
- **Step Over (F10)**: Execute current line, move to next
- **Step Into (F11)**: Enter into function calls
- **Step Out (Shift+F11)**: Exit current function
- **Restart (Cmd/Ctrl+Shift+F8)**: Restart debugging session

### Inspecting Variables

When paused, you can:

1. **Hover over variables** to see their values
2. **Use the Scope panel** to view local, closure, and global variables
3. **Add expressions to Watch panel** for monitoring specific values

```javascript
// When paused here, inspect all variables
app.post('/orders', (req, res) => {
  const { items, userId, total } = req.body;  // Hover to see values
  
  debugger;
  
  const order = createOrder(items, userId, total);
});
```

### Console in Debug Context

While paused, use the Console to:

```javascript
// Type in console while paused
> items
[{id: 1, name: "Widget"}, {id: 2, name: "Gadget"}]

> items.length
2

> items.filter(i => i.id > 1)
[{id: 2, name: "Gadget"}]

// Modify variables
> userId = 999
999
```

## Debugging with VS Code (Alternative)

VS Code integrates Chrome DevTools protocol:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current File",
      "program": "${file}"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

Press F5 to start debugging.

## Debugging Async Code

### Promises

```javascript
async function fetchUserData(userId) {
  debugger;  // Pause before fetch
  
  const user = await fetchUser(userId);
  
  debugger;  // Pause after fetch
  
  const orders = await fetchOrders(user.id);
  
  return { user, orders };
}
```

### Enable Async Stack Traces

In DevTools Settings (F1), enable:
- "Capture async stack traces"

This shows the full async call stack, not just the current promise.

### Debugging Callbacks

```javascript
// Set breakpoint inside callback
fs.readFile('data.json', 'utf8', (err, data) => {
  debugger;  // Pauses when callback fires
  
  if (err) {
    console.error(err);
    return;
  }
  
  const parsed = JSON.parse(data);
});
```

## Debugging Express Applications

```javascript
// server.js
const express = require('express');
const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  debugger;  // Inspect every request
  next();
});

// Debug specific route
app.get('/api/users/:id', (req, res) => {
  debugger;
  
  const userId = req.params.id;
  // Step through to inspect userId
});
```

Start with inspect:

```bash
node --inspect server.js
```

## Memory Profiling

### Taking Heap Snapshots

1. Open DevTools Memory tab
2. Select "Heap snapshot"
3. Click "Take snapshot"

Compare snapshots to find memory leaks:

```javascript
// Code with potential memory leak
const cache = new Map();

app.get('/data/:id', (req, res) => {
  const data = generateLargeData(req.params.id);
  cache.set(req.params.id, data);  // Never cleared!
  res.json(data);
});
```

### Allocation Timeline

Track memory allocations over time:

1. Select "Allocation instrumentation on timeline"
2. Click Start
3. Perform actions in your app
4. Click Stop

Look for objects that are allocated but never garbage collected.

### Identifying Leaks

```javascript
// Simulate leak for testing
const leaks = [];

app.get('/leak', (req, res) => {
  const data = Buffer.alloc(1024 * 1024);  // 1MB
  leaks.push(data);  // Never released
  res.send('Leaked 1MB');
});
```

Take snapshots before and after requests, compare retained sizes.

## Performance Profiling

### CPU Profiling

1. Open DevTools Performance tab (or Profiler)
2. Click Record
3. Perform actions
4. Click Stop

Analyze:
- **Flame chart**: Shows function call hierarchy
- **Bottom-up**: Shows functions by total time
- **Call tree**: Shows call hierarchy with timings

```javascript
// Profile slow function
function processData(data) {
  // CPU profiling shows time spent in each call
  const sorted = expensiveSort(data);
  const filtered = complexFilter(sorted);
  const transformed = heavyTransform(filtered);
  
  return transformed;
}
```

### Profiling from Command Line

```bash
# Start with profiler enabled
node --prof app.js

# Process the log
node --prof-process isolate-0xXXXX-v8.log > profile.txt
```

### Using v8-profiler in Code

```javascript
const v8Profiler = require('v8-profiler-next');

// Start profiling
v8Profiler.startProfiling('MyProfile', true);

// Run code to profile
await doExpensiveWork();

// Stop and save
const profile = v8Profiler.stopProfiling('MyProfile');
profile.export((error, result) => {
  fs.writeFileSync('profile.cpuprofile', result);
  profile.delete();
});
```

Load the .cpuprofile file in Chrome DevTools.

## Remote Debugging

### Debug Remote Server

On the server:

```bash
# Allow external connections
node --inspect=0.0.0.0:9229 app.js
```

On your machine, set up SSH tunnel:

```bash
ssh -L 9229:localhost:9229 user@server
```

Then open `chrome://inspect` locally.

### Docker Container Debugging

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY . .
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "app.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "9229:9229"
```

## Debugging Tests

### Jest

```bash
# Debug Jest tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

```json
// package.json
{
  "scripts": {
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### Mocha

```bash
node --inspect-brk node_modules/.bin/mocha
```

## Useful DevTools Features

### Blackboxing

Skip library code when stepping:

1. Right-click on a source file
2. Select "Blackbox script"

Or in Settings > Blackboxing, add patterns:
- `node_modules`
- `lodash.js`

### Logpoints

Add logging without modifying code:

1. Right-click on line number
2. Select "Add logpoint"
3. Enter expression: `"User ID:", userId`

### Watch Expressions

In the Watch panel, add expressions:

```javascript
// Watch these while debugging
users.length
currentUser?.name
req.headers['authorization']
Object.keys(cache)
```

### Source Maps

For TypeScript or transpiled code:

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

DevTools automatically loads source maps.

## Debugging Tips

### Log Points vs console.log

```javascript
// Instead of adding console.log
function process(data) {
  console.log('data:', data);  // Modifies code
  return transform(data);
}

// Use logpoints in DevTools
// Right-click line > Add logpoint > "data:", data
```

### Breaking on Exceptions

In Sources tab, enable:
- "Pause on exceptions"
- Optionally: "Pause on caught exceptions"

```javascript
// Debugger will pause here on error
try {
  riskyOperation();
} catch (err) {
  // Pause here if "caught exceptions" is enabled
  handleError(err);
}
```

### Breaking on Property Access

```javascript
// In console, set a getter breakpoint
debug(myObject.propertyName);
```

## Summary

| Feature | Use Case |
|---------|----------|
| `--inspect` | Basic debugging |
| `--inspect-brk` | Debug from start |
| Breakpoints | Pause at specific lines |
| `debugger` | Programmatic breakpoints |
| Heap snapshot | Find memory leaks |
| CPU profiling | Find performance bottlenecks |
| Async stacks | Debug async code flow |
| Source maps | Debug TypeScript |

Chrome DevTools provides a complete debugging experience for Node.js. Start with `--inspect-brk` for one-off debugging sessions, and set up VS Code launch configurations for regular development. Use memory and performance profiling when optimizing production applications.
