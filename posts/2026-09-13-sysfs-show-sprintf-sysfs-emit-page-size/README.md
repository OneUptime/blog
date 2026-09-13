# Use sysfs_emit to Avoid Buffer Bugs in sysfs show()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, C, C Programming

Description: Replace unsafe sysfs formatting with sysfs_emit and sysfs_emit_at while preserving bounded output and the attribute ABI.

A sysfs `show()` callback receives a buffer for a small text representation of an attribute. Formatting into that buffer with an unchecked `sprintf()` becomes dangerous when output grows beyond the size the author originally imagined.

`sysfs_emit()` is the kernel helper designed for this context. It bounds output to the sysfs page buffer and returns the number of characters actually written. That makes it a better starting point, but the driver must still ensure that truncation cannot silently corrupt its interface.

## Return the bytes you actually produced

For a scalar attribute, the callback can remain simple:

```c
static ssize_t count_show(struct device *dev,
                          struct device_attribute *attr, char *buf)
{
    struct example_state *state = dev_get_drvdata(dev);
    unsigned int count;

    mutex_lock(&state->lock);
    count = state->count;
    mutex_unlock(&state->lock);
    return sysfs_emit(buf, "%u\n", count);
}
```

This is an integration fragment with illustrative driver state. Include the relevant device, mutex, and sysfs headers and use the synchronization appropriate to your driver.

The return value excludes the terminating NUL, which is not part of the file's text content. Include a newline in a normal scalar text attribute so command-line output is well formed. Do not return `PAGE_SIZE` or the allocated buffer size merely because the buffer has that capacity. [Linux sysfs documentation](https://docs.kernel.org/filesystems/sysfs.html)

## Know the formatting differences

| Function | Important behavior for this task |
|---|---|
| `sprintf` | Does not receive a destination size |
| `snprintf` | Bounds writes but returns the length that would have been produced |
| `scnprintf` | Returns the length actually stored within its bound |
| `sysfs_emit` | Provides the sysfs page bound and actual-length behavior |

A callback using `snprintf(buf, PAGE_SIZE, ...)` can avoid an overwrite while returning an overlarge count on truncation. The sysfs helper avoids that mismatch. Its upstream implementation uses bounded formatting and checks that the supplied buffer is the expected page-aligned base. [Linux sysfs formatting helpers](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)

This does not make the returned text complete when the intended representation is too large. Memory safety and ABI completeness are separate properties.

## Append with the original buffer pointer

For a small, fixed-size array already defined by an attribute ABI, use `sysfs_emit_at()` with an offset into the original buffer:

```c
static ssize_t sample_window_show(struct device *dev,
                                  struct device_attribute *attr, char *buf)
{
    unsigned int sample[3] = { 10, 20, 30 };
    int used = 0;
    int i;

    for (i = 0; i < ARRAY_SIZE(sample); i++)
        used += sysfs_emit_at(buf, used, "%u%c", sample[i],
                              i == ARRAY_SIZE(sample) - 1 ? '\n' : ' ');
    return used;
}
```

The values above are illustrative constants. A real handler would snapshot its three values under appropriate synchronization. The output is deliberately fixed and comfortably smaller than a page.

Do not call `sysfs_emit(buf + used, ...)`. The helper expects the page-buffer base, not an arbitrary interior address. `sysfs_emit_at(buf, used, ...)` expresses the remaining capacity correctly. Its offset must remain nonnegative and less than `PAGE_SIZE`.

For new interfaces, prefer separate scalar attributes unless a homogeneous array is a natural, documented representation. Do not turn a single control into a multiline status report simply because an append helper exists.

## Prove the maximum representation fits

Calculate the worst case from the types and grammar. Three unsigned 32-bit decimal values need at most ten digits each plus separators and a newline. A bounded scalar is easy to reason about. A device-name string or a list whose size grows with hardware is less predictable.

Do not assume `PAGE_SIZE` is always 4096. Kernel page sizes vary by architecture and configuration. Using a fixed 4096-byte constant in the callback recreates a portability problem the helper was intended to remove.

If a representation can exceed one page, choose a different interface or split the data according to a meaningful ABI. Silently returning a shortened list can mislead callers into treating omitted entries as absent devices. An explicitly reported error is better than a success response that violates the documented format.

## Preserve format and consistency

A mechanical formatting change should preserve field order, base, units, separators, and newline behavior. A userspace parser can depend on those details. Match format specifiers to the actual C types; kernel-specific pointer and integer formatting rules are documented separately. [Kernel format specifier guidance](https://docs.kernel.org/core-api/printk-formats.html)

Snapshot related values consistently before formatting. Replacing `sprintf` does not fix torn observations if another thread updates the state midway through the read. Keep the lock only as long as needed to obtain a coherent snapshot when copying is practical.

## Validate meaningful boundaries

Test zero, maximum values, optional strings at their documented limits, and repeated reads with small userspace buffers. Confirm that the callback's returned count matches the emitted bytes and that the final newline is present.

When reviewing a conversion, inspect loops for incorrect offset accumulation and calls that pass an adjusted buffer pointer. An automated text replacement can compile while leaving those mistakes in place. The strongest validation combines a representation bound with a focused test of that bound on the target kernel.

## Conclusion

Use `sysfs_emit()` for a scalar and `sysfs_emit_at()` for carefully bounded appended output. Keep the original buffer pointer, return the actual length, and prove that the full representation fits. The helper protects the buffer; a clear size bound and stable format protect userspace.

## Official Documentation

- [Linux kernel: sysfs callback requirements](https://docs.kernel.org/filesystems/sysfs.html)
- [Linux kernel: sysfs_emit and sysfs_emit_at implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel: format specifiers](https://docs.kernel.org/core-api/printk-formats.html)
