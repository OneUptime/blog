# How to Validate IPv6 Addresses in Web Forms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Validation, JavaScript, Python, HTML5, Forms, Frontend

Description: Validate IPv6 addresses in web forms using HTML5 pattern attributes, JavaScript regex, Python ipaddress module, and framework-specific validators.

## Introduction

IPv6 addresses can appear in many formats (compressed, full, mixed IPv4/IPv6) making client-side and server-side validation important. HTML5 has no native IPv6 input type, so custom validation is necessary.

## Client-Side: HTML5 + JavaScript

```html
<!-- index.html -->
<form id="ip-form">
  <label for="ipv6">IPv6 Address:</label>
  <input
    type="text"
    id="ipv6"
    name="ipv6"
    placeholder="2001:db8::1"
    aria-describedby="ipv6-hint"
  />
  <span id="ipv6-hint" class="hint">
    Examples: ::1, 2001:db8::1, fe80::1%eth0
  </span>
  <span id="ipv6-error" class="error" style="display:none;"></span>
  <button type="submit">Submit</button>
</form>
```

```javascript
// validation.js

function isValidIPv6(address) {
    // Remove zone ID (e.g., fe80::1%eth0 → fe80::1)
    const clean = address.split('%')[0];

    // RFC 4291 IPv6 regex. JavaScript has no verbose/extended flag,
    // so the whole alternation must be on a single line.
    const v6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    return v6Regex.test(clean);
}

// Better: delegate parsing to the browser's URL constructor.
function isValidIPv6Reliable(address) {
    try {
        // The URL parser only accepts bracketed IPv6 literals in the host,
        // and throws TypeError for anything that isn't a valid IPv6 address.
        const url = new URL(`http://[${address}]/`);
        return url.hostname.startsWith('[') && url.hostname.endsWith(']');
    } catch {
        return false;
    }
}

document.getElementById('ip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('ipv6').value.trim();
    const errorEl = document.getElementById('ipv6-error');

    if (!isValidIPv6Reliable(val)) {
        errorEl.textContent = 'Invalid IPv6 address';
        errorEl.style.display = 'inline';
    } else {
        errorEl.style.display = 'none';
        console.log('Valid:', val);
    }
});
```

## Server-Side: Python ipaddress Module

```python
import ipaddress
from typing import Optional

def validate_ipv6(address: str, allow_loopback: bool = False) -> Optional[str]:
    """
    Validate an IPv6 address string.
    Returns normalized form or None if invalid.
    """
    # Remove zone ID
    clean = address.split('%')[0].strip()

    try:
        addr = ipaddress.IPv6Address(clean)
    except ValueError:
        return None

    if not allow_loopback and addr.is_loopback:
        return None  # Reject ::1

    if addr.is_unspecified:
        return None  # Reject ::

    return str(addr)  # Canonical form

# Test

print(validate_ipv6("2001:DB8::1"))       # 2001:db8::1 (normalized)
print(validate_ipv6("::1"))               # None (loopback rejected)
print(validate_ipv6("::1", allow_loopback=True))  # ::1
print(validate_ipv6("invalid"))           # None
print(validate_ipv6("192.0.2.1"))         # None (not IPv6)
```

## WTForms / Flask-WTF Validator

```python
# validators.py
from wtforms import ValidationError
import ipaddress

class IPv6Address:
    def __init__(self, allow_private=True, message=None):
        self.allow_private = allow_private
        self.message = message or "Invalid IPv6 address"

    def __call__(self, form, field):
        try:
            addr = ipaddress.IPv6Address(field.data.strip())
            if not self.allow_private and addr.is_private:
                raise ValidationError("Private IPv6 addresses not allowed")
        except ValueError:
            raise ValidationError(self.message)
```

## Conclusion

IPv6 validation requires handling compressed forms, mixed IPv4/IPv6 notation, and zone IDs. Use Python's `ipaddress.IPv6Address()` for server-side validation - it handles all valid forms. On the frontend, the URL constructor trick provides reliable browser-native validation. Always normalize to canonical form before storage. Add OneUptime monitors to test IPv6 form validation endpoints in staging environments.
