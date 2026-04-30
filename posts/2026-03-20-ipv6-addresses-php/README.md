# How to Handle IPv6 Addresses in PHP Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, IPv6, Networking, Validation, Socket Programming, Web Development

Description: Handle, validate, parse, and use IPv6 addresses in PHP applications using filter_var, inet_pton, and socket functions for web and CLI applications.

## Introduction

PHP provides IPv6 support through built-in functions including `filter_var()` with `FILTER_VALIDATE_IP`, `inet_pton()`, and `inet_ntop()`. PHP web applications running behind trusted proxies need careful handling of IPv6 client addresses in `$_SERVER` superglobals.

## Validating IPv6 Addresses

```php
<?php

/**
 * Validate an IPv6 address using PHP's built-in filter.
 */
function isIPv6(string $address): bool {
    // Strip zone ID if present (e.g., "fe80::1%eth0")
    $clean = explode('%', $address)[0];

    return filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
}

/**
 * Check if an address is IPv4 or IPv6.
 */
function getIPVersion(string $address): ?int {
    $clean = explode('%', $address)[0];

    if (filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return 4;
    }
    if (filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        return 6;
    }
    return null;
}

// Test cases
$addresses = [
    '2001:db8::1',
    '::1',
    'fe80::1%eth0',
    '192.168.1.1',
    'not-an-address',
];

foreach ($addresses as $addr) {
    $version = getIPVersion($addr);
    echo sprintf("%-25s version=%s\n", $addr, $version ?? 'invalid');
}
```

## Expanding and Compressing IPv6 Addresses

```php
<?php

/**
 * Expand a compressed IPv6 address to full notation.
 * e.g., "2001:db8::1" → "2001:0db8:0000:0000:0000:0000:0000:0001"
 */
function expandIPv6(string $address): string {
    [$clean, $zoneId] = array_pad(explode('%', $address, 2), 2, null);
    if (filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
        throw new InvalidArgumentException("Invalid IPv6: $address");
    }
    // inet_pton converts to packed binary; format the bytes back into full hextets
    $packed = inet_pton($clean);
    if ($packed === false) {
        throw new InvalidArgumentException("Invalid IPv6: $address");
    }
    // Unpack as hex, then format in groups of 4
    $hex = bin2hex($packed);
    $groups = str_split($hex, 4);
    $expanded = implode(':', $groups);

    return $zoneId !== null && $zoneId !== '' ? $expanded . '%' . $zoneId : $expanded;
}

/**
 * Compress an IPv6 address to a shorter text form.
 */
function compressIPv6(string $address): string {
    [$clean, $zoneId] = array_pad(explode('%', $address, 2), 2, null);
    if (filter_var($clean, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
        throw new InvalidArgumentException("Invalid IPv6: $address");
    }
    $packed = inet_pton($clean);
    if ($packed === false) {
        throw new InvalidArgumentException("Invalid IPv6: $address");
    }
    $compressed = inet_ntop($packed);

    return $zoneId !== null && $zoneId !== '' ? $compressed . '%' . $zoneId : $compressed;
}

echo expandIPv6('2001:db8::1');
// Output: 2001:0db8:0000:0000:0000:0000:0000:0001

echo compressIPv6('2001:0db8:0000:0000:0000:0000:0000:0001');
// Output: 2001:db8::1
```

## Getting the Real Client IP in PHP

```php
<?php

/**
 * Normalize a client or proxy IP address.
 */
function normalizeIP(string $ip): ?string {
    $ip = trim($ip);
    if ($ip === '') {
        return null;
    }

    // Zone IDs are only locally significant and are not used in proxy headers
    $ip = explode('%', $ip, 2)[0];

    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        // Convert IPv4-mapped IPv6 (for example ::ffff:192.0.2.1) to plain IPv4
        $packed = inet_pton($ip);
        if (
            $packed !== false &&
            substr($packed, 0, 12) === str_repeat("\x00", 10) . "\xff\xff"
        ) {
            return inet_ntop(substr($packed, 12));
        }

        return $ip;
    }

    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return $ip;
    }

    return null;
}

/**
 * Get the client IP address when the app is behind a trusted proxy or CDN.
 */
function getClientIP(array $trustedProxies = []): string {
    $remoteAddr = normalizeIP($_SERVER['REMOTE_ADDR'] ?? '');
    if ($remoteAddr === null) {
        return '0.0.0.0';
    }

    // If the direct peer is not trusted, ignore forwarding headers.
    if (!in_array($remoteAddr, $trustedProxies, true)) {
        return $remoteAddr;
    }

    // Cloudflare sends this header when traffic reaches your origin through Cloudflare.
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $cfIP = normalizeIP($_SERVER['HTTP_CF_CONNECTING_IP']);
        if ($cfIP !== null) {
            return $cfIP;
        }
    }

    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwarded = array_values(array_filter(array_map(
            'normalizeIP',
            explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])
        )));

        // Search from the right, skipping trusted proxies, and return the
        // first untrusted address in the chain.
        for ($i = count($forwarded) - 1; $i >= 0; $i--) {
            if (!in_array($forwarded[$i], $trustedProxies, true)) {
                return $forwarded[$i];
            }
        }
    }

    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $realIP = normalizeIP($_SERVER['HTTP_X_REAL_IP']);
        if ($realIP !== null) {
            return $realIP;
        }
    }

    return $remoteAddr;
}

$trustedProxies = [
    '203.0.113.10', // Replace with your reverse proxy or load balancer IP
];

$clientIP = getClientIP($trustedProxies);
$isIPv6 = filter_var($clientIP, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
echo "Client IP: $clientIP (" . ($isIPv6 ? 'IPv6' : 'IPv4') . ")";
```

## Checking Subnet Membership

```php
<?php

/**
 * Check if an IPv6 address belongs to a given CIDR block.
 */
function ipv6InCidr(string $ip, string $cidr): bool {
    $parts = explode('/', $cidr, 2);
    if (count($parts) !== 2 || !ctype_digit($parts[1])) {
        return false;
    }

    [$network, $prefix] = $parts;
    $prefix = (int) $prefix;
    if ($prefix < 0 || $prefix > 128) {
        return false;
    }

    $ip = explode('%', $ip, 2)[0];
    $network = explode('%', $network, 2)[0];

    if (
        filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false ||
        filter_var($network, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false
    ) {
        return false;
    }

    // Convert addresses to packed binary
    $ipBinary = inet_pton($ip);
    $networkBinary = inet_pton($network);

    if ($ipBinary === false || $networkBinary === false) {
        return false;
    }

    // Build bitmask from prefix length
    $bits = str_repeat('1', $prefix) . str_repeat('0', 128 - $prefix);
    $mask = '';
    foreach (str_split($bits, 8) as $byte) {
        $mask .= chr(bindec($byte));
    }

    return ($ipBinary & $mask) === ($networkBinary & $mask);
}

// Test
echo ipv6InCidr('2001:db8::1', '2001:db8::/32') ? 'yes' : 'no';   // yes
echo ipv6InCidr('2001:db9::1', '2001:db8::/32') ? 'yes' : 'no';   // no
```

## Creating a Socket Connection to IPv6

```php
<?php

// Create an IPv6 TCP socket
$socket = socket_create(AF_INET6, SOCK_STREAM, SOL_TCP);
if ($socket === false) {
    die('socket_create failed: ' . socket_strerror(socket_last_error()));
}

// Connect to an IPv6 server (no brackets needed in socket functions)
$result = socket_connect($socket, '2001:db8::1', 8080);
if ($result === false) {
    die('socket_connect failed: ' . socket_strerror(socket_last_error($socket)));
}

// Send and receive data
socket_write($socket, "GET / HTTP/1.1\r\nHost: [2001:db8::1]:8080\r\nConnection: close\r\n\r\n");
$response = socket_read($socket, 4096);
echo $response;
socket_close($socket);
```

## Formatting IPv6 for URLs in PHP

```php
<?php

/**
 * Format an IP address for use in a URL.
 * IPv6 addresses require bracket notation per RFC 3986.
 * Scoped IPv6 zone IDs use %25 encoding per RFC 6874.
 */
function formatIPForUrl(string $ip): string {
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return $ip;
    }

    [$address, $zoneId] = array_pad(explode('%', $ip, 2), 2, null);
    if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
        throw new InvalidArgumentException("Invalid IP address: $ip");
    }

    if ($zoneId !== null && $zoneId !== '') {
        return '[' . $address . '%25' . rawurlencode($zoneId) . ']';
    }

    return "[{$address}]";
}

$ipv6 = '2001:db8::1';
$url = 'https://' . formatIPForUrl($ipv6) . ':443/api/v1';
echo $url;  // https://[2001:db8::1]:443/api/v1
```

## Conclusion

PHP handles IPv6 through `filter_var()` with `FILTER_FLAG_IPV6`, `inet_pton()`/`inet_ntop()` for binary conversion, and `AF_INET6` for socket creation. Strip zone IDs before pure address validation or comparison, trust proxy headers only for known proxies or CDNs, and use bracket notation when building IPv6 URLs (with `%25` zone ID encoding for scoped addresses).
