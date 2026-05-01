# How to Display IPv6 Addresses in Web UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, UI, JavaScript, React, Formatting, Display, Bracket Notation

Description: Format and display IPv6 addresses correctly in web interfaces, including bracket notation for URLs, shortened display forms, and copy-to-clipboard functionality.

## Introduction

IPv6 addresses in web UIs require special handling: they need bracket notation in URLs, can be long and hard to read, and users may need to copy them in different formats. This post covers formatting helpers, React components, and UX patterns for displaying IPv6 addresses.

## Step 1: JavaScript Formatting Utilities

```javascript
// utils/ipv6.js

function splitIPv6Address(address) {
    const unwrapped =
        address.startsWith('[') && address.endsWith(']')
            ? address.slice(1, -1)
            : address;
    const zoneSeparator = unwrapped.indexOf('%');

    return zoneSeparator === -1
        ? { baseAddress: unwrapped, zoneSuffix: '' }
        : {
            baseAddress: unwrapped.slice(0, zoneSeparator),
            zoneSuffix: unwrapped.slice(zoneSeparator),
        };
}

function expandEmbeddedIPv4(ipv4Address) {
    const octets = ipv4Address.split('.');

    if (octets.length !== 4) {
        return null;
    }

    const values = octets.map((octet) => Number(octet));

    if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
        return null;
    }

    return [
        ((values[0] << 8) | values[1]).toString(16).padStart(4, '0'),
        ((values[2] << 8) | values[3]).toString(16).padStart(4, '0'),
    ];
}

function expandIPv6Groups(address) {
    const { baseAddress } = splitIPv6Address(address);

    if (!baseAddress.includes(':') || (baseAddress.match(/::/g) || []).length > 1) {
        return null;
    }

    const [left = '', right = ''] = baseAddress.split('::');

    const normalizePart = (part) => {
        if (!part) return [];

        const groups = part.split(':');
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && lastGroup.includes('.')) {
            const ipv4Groups = expandEmbeddedIPv4(groups.pop());
            if (!ipv4Groups) return null;
            groups.push(...ipv4Groups);
        }

        if (groups.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) {
            return null;
        }

        return groups.map((group) => group.toLowerCase().padStart(4, '0'));
    };

    const leftGroups = normalizePart(left);
    const rightGroups = normalizePart(right);

    if (!leftGroups || !rightGroups) {
        return null;
    }

    if (baseAddress.includes('::')) {
        const zeroGroups = 8 - (leftGroups.length + rightGroups.length);

        if (zeroGroups < 1) {
            return null;
        }

        return [
            ...leftGroups,
            ...Array(zeroGroups).fill('0000'),
            ...rightGroups,
        ];
    }

    const groups = [...leftGroups, ...rightGroups];
    return groups.length === 8 ? groups : null;
}

/**
 * Format an IPv6 address for display in URLs (adds brackets).
 * IPv4 addresses are returned unchanged.
 */
export function formatForURL(address) {
    const isBracketed = address.startsWith('[') && address.endsWith(']');
    const rawAddress = isBracketed ? address.slice(1, -1) : address;

    if (rawAddress.includes(':')) {
        // RFC 6874 requires zone identifiers in URLs to escape "%" as "%25".
        const zoneSafeAddress = rawAddress.replace(/%(?!25)/, '%25');
        return `[${zoneSafeAddress}]`;
    }

    return address;  // IPv4
}

/**
 * Truncate a long IPv6 address for compact display.
 * Keeps leading and trailing groups with an ellipsis.
 */
export function truncateIPv6(address, maxLength = 20) {
    if (address.length <= maxLength) return address;

    const groups = expandIPv6Groups(address);

    if (!groups) {
        return `${address.slice(0, maxLength - 1)}…`;
    }

    const compact = `${groups[0]}:${groups[1]}:…:${groups[6]}:${groups[7]}`;
    if (compact.length <= maxLength) return compact;

    return `${groups[0]}:…:${groups[7]}`;
}

/**
 * Expand compressed IPv6 to full form for display.
 * Useful when showing the full address for debugging.
 */
export function expandIPv6(address) {
    const { zoneSuffix } = splitIPv6Address(address);
    const groups = expandIPv6Groups(address);

    if (!groups) return address;

    return `${groups.join(':')}${zoneSuffix}`;
}

/**
 * Get the /64 prefix for display.
 */
export function getIPv6Prefix64(address) {
    const groups = expandIPv6Groups(address);

    if (!groups) return address;

    return `${groups.slice(0, 4).join(':')}::/64`;
}
```

## Step 2: React IPv6 Display Component

```jsx
// components/IPv6Address.jsx
import React, { useState } from 'react';
import { truncateIPv6 } from '../utils/ipv6';

export function IPv6Address({ address, showFull = false, copyable = true }) {
    const [copied, setCopied] = useState(false);

    const isIPv6 = Boolean(address && address.includes(':'));
    const displayAddress = isIPv6 && !showFull
        ? truncateIPv6(address)
        : address;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy IP address:', error);
        }
    };

    if (!isIPv6) {
        return <code className="ip-address ipv4">{address}</code>;
    }

    return (
        <span className="ip-address-wrapper">
            <code
                className="ip-address ipv6"
                title={`Full: ${address}`}
                style={{ fontFamily: 'monospace' }}
            >
                {displayAddress}
            </code>
            {copyable && (
                <button
                    type="button"
                    onClick={copyToClipboard}
                    className="copy-btn"
                    title="Copy IPv6 address"
                    aria-label={`Copy ${address}`}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            )}
        </span>
    );
}

// Usage
function ConnectionList({ connections }) {
    return (
        <table>
            <thead>
                <tr>
                    <th>Client IP</th>
                    <th>Connected At</th>
                </tr>
            </thead>
            <tbody>
                {connections.map(conn => (
                    <tr key={conn.id}>
                        <td>
                            <IPv6Address
                                address={conn.ip}
                                copyable={true}
                            />
                        </td>
                        <td>{conn.timestamp}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
```

## Step 3: Clickable IPv6 Links

```javascript
// utils/createIPv6Link.js
import { formatForURL } from './ipv6';

export function createIPv6Link(address, port, protocol = 'http') {
    const host = formatForURL(address);
    if (port) {
        return `${protocol}://${host}:${port}`;
    }
    return `${protocol}://${host}`;
}

// React link component
export function IPv6Link({ address, port, protocol = 'https', children }) {
    const href = createIPv6Link(address, port, protocol);
    const label = port
        ? `${protocol}://${formatForURL(address)}:${port}`
        : `${protocol}://${formatForURL(address)}`;

    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children || label}
        </a>
    );
}
```

## Step 4: CSS Styling for IPv6 Addresses

```css
/* ipv6.css */

.ip-address {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.875rem;
    background: #f0f4f8;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #d0d7de;
    white-space: nowrap;
    user-select: all;  /* Select the whole address at once */
}

.ip-address.ipv6 {
    color: #1a56db;  /* Blue for IPv6 */
}

.ip-address.ipv4 {
    color: #0e7a0d;  /* Green for IPv4 */
}

.ip-address-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.copy-btn {
    font-size: 0.75rem;
    padding: 2px 6px;
    cursor: pointer;
    border: 1px solid #d0d7de;
    border-radius: 3px;
    background: white;
}
```

## Step 5: Sorting and Filtering IPv6 in Tables

```javascript
// Sort IPv6 addresses in a table
import { expandIPv6 } from './ipv6';

function sortIPv6(addresses) {
    return addresses.sort((a, b) => {
        // Expand each address to 8 padded groups for lexicographic sort.
        const aExpanded = expandIPv6(a).toLowerCase();
        const bExpanded = expandIPv6(b).toLowerCase();

        if (aExpanded < bExpanded) return -1;
        if (aExpanded > bExpanded) return 1;
        return 0;
    });
}
```

## Conclusion

Displaying IPv6 addresses in web UIs requires bracket notation in hyperlinks, monospace fonts for readability, copy-to-clipboard functionality, and `user-select: all` CSS for easy selection. React components can handle the formatting logic centrally. Use `createIPv6Link()` to generate correct `href` attributes. Monitor your web UI's IPv6 display components with OneUptime's visual regression checks.
