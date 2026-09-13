# Why Partial Writes Fail in sysfs and How store() Should Parse Input

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, C, Troubleshooting

Description: Treat each sysfs text write as one complete request, handle newlines deliberately, and reject malformed input before changing state.

A sysfs text attribute looks like a file, but it usually behaves like a small command interface. Writing `1` and then `00` does not assemble the value `100`. Each write can invoke the driver's `store()` callback independently, and that callback does not receive a text-file offset at which to patch the previous value.

Build the full request in userspace, send it in one write, and make the driver parse the complete request before making changes.

## Separate a value from a byte stream

Consider an attribute representing a decimal limit. This sequence expresses two requests, not one fragmented request:

```python
os.write(fd, b'1')
os.write(fd, b'00\n')
```

Depending on the implementation, the device might briefly receive a limit of 1 followed by 0, reject one write, or apply another attribute-specific rule. Seeking or opening with append mode does not create a general editing protocol.

The normal sysfs write dispatcher passes the buffer and count to `store()` without passing the write offset. Binary attributes have a different callback contract and must not be generalized from this text-attribute behavior. [Linux sysfs write dispatch](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)

Editors can be especially unsuitable: they may use temporary files, rename, truncate, or multiple writes. Those are ordinary filesystem workflows that a kernel attribute is not obliged to support.

## Send one complete buffer

For a documented control, a small shell value is commonly written with:

```bash
attribute=/sys/devices/platform/example-device/limit
printf '%s\n' 100 | sudo tee "$attribute" >/dev/null
```

The path is illustrative and the command performs a real write when replaced with a working path. For code where the system-call boundary matters, use an unbuffered write explicitly:

```python
import os

path = '/sys/devices/platform/example-device/limit'
payload = b'100\n'
fd = os.open(path, os.O_WRONLY | os.O_CLOEXEC)
try:
    written = os.write(fd, payload)
    if written != len(payload):
        raise RuntimeError(f'Unexpected short write: {written}')
finally:
    os.close(fd)
```

Do not automatically send a short write's remainder as though the destination were a socket. The first write may already have represented an operation. Report the unexpected result and apply a retry policy based on the attribute's semantics.

Keep input within the documented small size. Current kernfs handles atomic write bounds and NUL-terminates copied input, but an application should not rely on oversized writes being assembled into one request. [Kernel kernfs write implementation](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)

## Parse before touching state

This callback fragment illustrates a decimal range from 1 to 1000 with strict rejection of embedded NUL bytes:

```c
static ssize_t limit_store(struct device *dev,
                           struct device_attribute *attr,
                           const char *buf, size_t count)
{
    struct example_state *state = dev_get_drvdata(dev);
    unsigned int value;
    int ret;

    if (!count || memchr(buf, '\0', count))
        return -EINVAL;

    ret = kstrtouint(buf, 10, &value);
    if (ret)
        return ret;
    if (value < 1 || value > 1000)
        return -EINVAL;

    mutex_lock(&state->lock);
    state->limit = value;
    mutex_unlock(&state->lock);
    return count;
}
```

The example modifies only an illustrative software field. A hardware driver must perform and check the actual programming operation, coordinate power state, and define when a cached value is updated.

The count excludes the terminator that kernfs adds after the copied request. Rejecting an embedded NUL prevents a string parser from accepting an early prefix and ignoring later supplied bytes. This strictness should be part of the ABI policy rather than added casually to an established interface.

## Handle newlines and grammar deliberately

`kstrtouint()` accepts a decimal integer with its documented optional leading plus sign and optional trailing newline. It reports parsing and overflow errors. Passing base 10 avoids making a leading zero imply octal through autodetection. A valid integer still needs an application-specific range check. [Kernel conversion helper implementation](https://github.com/torvalds/linux/blob/master/lib/kstrtox.c)

For named modes, `sysfs_streq()` is useful when the intended grammar is a token with an optional terminal newline. Do not use a prefix comparison that accepts `auto-invalid` as `auto`. Avoid assuming `sscanf()` consumed the whole buffer just because it converted one field successfully.

Choose whether units belong in the filename, ABI documentation, or input grammar. If the control is milliseconds, accepting an unparsed suffix such as `100ms` through loose conversion creates ambiguity rather than convenience.

## Keep validation and mutation atomic

Multiple processes can open and write the same attribute. Parsing into a local variable outside the lock is usually straightforward; checking current state and committing the transition may need the same lock so another writer cannot invalidate the decision.

If several settings must change together, separate sysfs files do not provide a cross-file transaction. Design a suitable subsystem interface instead of relying on userspace to write several attributes quickly enough.

For testing, include an empty input, missing number, overflow, out-of-range value, valid newline, extra trailing characters, embedded NUL, and concurrent requests. Failed requests should leave the documented state unchanged. Confirm accepted requests return the original count rather than the number of digits parsed.

## Conclusion

Treat each sysfs text write as one complete request. Build it before calling write, use deliberate parser grammar, and perform no mutation until validation succeeds. That approach avoids accidental intermediate values and makes both errors and successful state changes predictable.

## Official Documentation

- [Linux kernel: sysfs write operations](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel: kernfs input handling](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)
- [Linux kernel: numeric conversion helpers](https://github.com/torvalds/linux/blob/master/lib/kstrtox.c)
