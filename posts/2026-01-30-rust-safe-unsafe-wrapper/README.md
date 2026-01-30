# How to Create Safe Wrapper for Unsafe Code in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Unsafe, Safety, Systems Programming

Description: Build safe abstractions over unsafe Rust code by encapsulating invariants, documenting safety requirements, and maintaining Rust's safety guarantees.

---

Rust's safety guarantees are one of its most powerful features. The borrow checker, lifetime system, and type system work together to prevent entire classes of bugs at compile time. But sometimes you need to step outside these guarantees. FFI calls, hardware access, performance-critical code, or implementing fundamental data structures all require `unsafe` blocks.

The key insight is that `unsafe` code does not mean "dangerous code you should avoid." It means "code where the compiler cannot verify safety, so the programmer takes responsibility." Your job is to encapsulate that responsibility behind a safe API.

## When Unsafe Is Actually Necessary

Before reaching for `unsafe`, make sure you actually need it. Here are the five things you can only do in unsafe Rust:

| Operation | Example Use Case |
|-----------|------------------|
| Dereference raw pointers | Custom allocators, FFI |
| Call unsafe functions | C library bindings |
| Access mutable static variables | Global configuration |
| Implement unsafe traits | Custom `Send`/`Sync` types |
| Access union fields | Memory reinterpretation |

Let's look at a practical example. Say you're building a ring buffer for a high-performance logging system. You need precise control over memory layout and want to avoid bounds checks in the hot path.

```rust
/// A fixed-size ring buffer optimized for single-producer, single-consumer use.
///
/// # Safety Invariants
/// - `head` and `tail` are always valid indices into `buffer`
/// - The buffer capacity is always a power of two (enables fast modulo)
/// - Elements between tail and head are initialized
pub struct RingBuffer<T> {
    buffer: *mut T,
    capacity: usize,
    head: usize,  // Next write position
    tail: usize,  // Next read position
}
```

## The Foundation: SAFETY Comments

Every unsafe block needs a `SAFETY` comment explaining why the operation is sound. This is not optional documentation. It is a contract between you and future maintainers (including yourself in six months).

The format is straightforward:

```rust
impl<T> RingBuffer<T> {
    /// Creates a new ring buffer with the given capacity.
    /// Capacity must be a power of two.
    pub fn new(capacity: usize) -> Self {
        assert!(capacity.is_power_of_two(), "capacity must be power of two");
        assert!(capacity > 0, "capacity must be non-zero");

        let layout = std::alloc::Layout::array::<T>(capacity)
            .expect("layout calculation failed");

        // SAFETY: We verified capacity > 0, so layout has non-zero size.
        // Layout::array handles alignment requirements for T.
        let buffer = unsafe { std::alloc::alloc(layout) as *mut T };

        if buffer.is_null() {
            std::alloc::handle_alloc_error(layout);
        }

        Self {
            buffer,
            capacity,
            head: 0,
            tail: 0,
        }
    }
}
```

Notice how the SAFETY comment references the specific preconditions that make the unsafe operation valid. It does not just say "this is safe" or "trust me."

## Encapsulating Unsafe in a Safe API

The goal is to make the safe API impossible to misuse in a way that violates the unsafe invariants. Here's how we build push and pop operations:

```rust
impl<T> RingBuffer<T> {
    /// Returns the number of elements in the buffer.
    #[inline]
    pub fn len(&self) -> usize {
        // This works because capacity is a power of two
        self.head.wrapping_sub(self.tail) & (self.capacity - 1)
    }

    /// Returns true if the buffer is empty.
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.head == self.tail
    }

    /// Returns true if the buffer is full.
    #[inline]
    pub fn is_full(&self) -> bool {
        self.len() == self.capacity - 1
    }

    /// Pushes an element to the buffer.
    /// Returns Err with the element if the buffer is full.
    pub fn push(&mut self, value: T) -> Result<(), T> {
        if self.is_full() {
            return Err(value);
        }

        // SAFETY:
        // - head is always < capacity (maintained by masking below)
        // - We checked the buffer is not full, so this slot is not occupied
        // - buffer was allocated with capacity elements
        unsafe {
            self.buffer.add(self.head).write(value);
        }

        // Mask ensures head stays in bounds even with wrapping
        self.head = (self.head + 1) & (self.capacity - 1);
        Ok(())
    }

    /// Removes and returns the oldest element.
    /// Returns None if the buffer is empty.
    pub fn pop(&mut self) -> Option<T> {
        if self.is_empty() {
            return None;
        }

        // SAFETY:
        // - tail is always < capacity (maintained by masking below)
        // - We checked the buffer is not empty, so this slot is initialized
        // - After read, we advance tail so we won't read this slot again
        let value = unsafe { self.buffer.add(self.tail).read() };

        self.tail = (self.tail + 1) & (self.capacity - 1);
        Some(value)
    }
}
```

The key insight: callers cannot violate our invariants because:

1. They cannot access `buffer`, `head`, or `tail` directly (private fields)
2. Every public method maintains the invariants
3. Bounds checking happens before any unsafe operation

## Implementing Drop Correctly

Memory management is where unsafe wrappers often go wrong. You must handle both deallocation and dropping contained elements:

```rust
impl<T> Drop for RingBuffer<T> {
    fn drop(&mut self) {
        // First, drop all elements currently in the buffer
        while let Some(_) = self.pop() {
            // pop() handles reading and advancing tail
            // The value is dropped here when it goes out of scope
        }

        // Now deallocate the buffer itself
        let layout = std::alloc::Layout::array::<T>(self.capacity)
            .expect("layout calculation failed");

        // SAFETY:
        // - buffer was allocated with this exact layout in new()
        // - We just dropped all elements, so no initialized data remains
        // - This is the only place we deallocate buffer
        unsafe {
            std::alloc::dealloc(self.buffer as *mut u8, layout);
        }
    }
}
```

## Handling Variance with PhantomData

When your type contains raw pointers, Rust cannot infer the correct variance. This matters for lifetimes and type parameters. Consider this problematic code:

```rust
// BAD: Rust assumes T is invariant because we use *mut T
pub struct BadBuffer<T> {
    ptr: *mut T,
    len: usize,
}
```

The problem is that `*mut T` is invariant over `T`, but our buffer should be covariant. If you have a `BadBuffer<&'static str>`, you should be able to use it where a `BadBuffer<&'a str>` is expected (for any `'a`).

Fix this with `PhantomData`:

```rust
use std::marker::PhantomData;

/// A buffer that owns its elements.
///
/// PhantomData<T> tells Rust this type logically owns T values,
/// enabling correct variance and drop checking.
pub struct Buffer<T> {
    ptr: *mut T,
    len: usize,
    cap: usize,
    // Indicates ownership of T, makes Buffer<T> covariant over T
    _marker: PhantomData<T>,
}
```

Here's a reference table for `PhantomData` usage:

| PhantomData Type | Variance | Use When |
|------------------|----------|----------|
| `PhantomData<T>` | Covariant, owns T | You own T values (like Vec) |
| `PhantomData<*const T>` | Covariant, no ownership | You observe T but don't own |
| `PhantomData<*mut T>` | Invariant | You need exact type matching |
| `PhantomData<fn() -> T>` | Covariant | Output type position |
| `PhantomData<fn(T)>` | Contravariant | Input type position |

## Documenting Safety Requirements

For functions that are themselves unsafe, document what the caller must guarantee:

```rust
impl<T> Buffer<T> {
    /// Creates a Buffer from raw parts.
    ///
    /// # Safety
    ///
    /// Callers must ensure:
    /// - `ptr` was allocated with the global allocator
    /// - `ptr` has space for at least `cap` elements of T
    /// - The first `len` elements are properly initialized
    /// - `len <= cap`
    /// - `cap` matches the allocation size exactly
    /// - No other code will free or access this memory
    ///
    /// # Example
    ///
    /// ```
    /// use std::alloc::{alloc, Layout};
    ///
    /// let layout = Layout::array::<i32>(10).unwrap();
    /// let ptr = unsafe { alloc(layout) as *mut i32 };
    ///
    /// // Initialize first 5 elements
    /// for i in 0..5 {
    ///     unsafe { ptr.add(i).write(i as i32); }
    /// }
    ///
    /// let buffer = unsafe { Buffer::from_raw_parts(ptr, 5, 10) };
    /// ```
    pub unsafe fn from_raw_parts(ptr: *mut T, len: usize, cap: usize) -> Self {
        debug_assert!(!ptr.is_null());
        debug_assert!(len <= cap);

        Self {
            ptr,
            len,
            cap,
            _marker: PhantomData,
        }
    }

    /// Consumes the Buffer and returns its raw parts.
    ///
    /// After calling this, the caller is responsible for freeing the memory.
    pub fn into_raw_parts(self) -> (*mut T, usize, usize) {
        let parts = (self.ptr, self.len, self.cap);
        std::mem::forget(self);  // Don't run Drop
        parts
    }
}
```

## Interior Mutability and UnsafeCell

When you need to mutate data through a shared reference, `UnsafeCell` is the only legal way to do it. Here's a simple spinlock implementation:

```rust
use std::cell::UnsafeCell;
use std::sync::atomic::{AtomicBool, Ordering};
use std::ops::{Deref, DerefMut};

/// A simple spinlock for mutual exclusion.
///
/// # Safety Invariants
/// - Data can only be accessed while the lock is held
/// - The lock is always released before the guard is dropped
pub struct SpinLock<T> {
    locked: AtomicBool,
    // UnsafeCell allows mutation through &self
    data: UnsafeCell<T>,
}

// SAFETY: SpinLock provides mutual exclusion, so concurrent
// access is synchronized. T must be Send because we transfer
// ownership across threads when locking.
unsafe impl<T: Send> Send for SpinLock<T> {}

// SAFETY: &SpinLock provides access to T across threads,
// but only one thread can hold the lock at a time.
unsafe impl<T: Send> Sync for SpinLock<T> {}

/// RAII guard that releases the lock when dropped.
pub struct SpinLockGuard<'a, T> {
    lock: &'a SpinLock<T>,
}

impl<T> SpinLock<T> {
    /// Creates a new spinlock wrapping the given value.
    pub const fn new(value: T) -> Self {
        Self {
            locked: AtomicBool::new(false),
            data: UnsafeCell::new(value),
        }
    }

    /// Acquires the lock, blocking until available.
    pub fn lock(&self) -> SpinLockGuard<'_, T> {
        // Spin until we acquire the lock
        while self
            .locked
            .compare_exchange_weak(
                false,
                true,
                Ordering::Acquire,
                Ordering::Relaxed,
            )
            .is_err()
        {
            // Hint to the CPU that we're spinning
            std::hint::spin_loop();
        }

        SpinLockGuard { lock: self }
    }
}

impl<T> Deref for SpinLockGuard<'_, T> {
    type Target = T;

    fn deref(&self) -> &T {
        // SAFETY: We hold the lock, so we have exclusive access
        unsafe { &*self.lock.data.get() }
    }
}

impl<T> DerefMut for SpinLockGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        // SAFETY: We hold the lock, so we have exclusive access
        unsafe { &mut *self.lock.data.get() }
    }
}

impl<T> Drop for SpinLockGuard<'_, T> {
    fn drop(&mut self) {
        self.lock.locked.store(false, Ordering::Release);
    }
}
```

## Testing Unsafe Code

Testing unsafe code requires extra care. You need to test not just correctness but also memory safety. Start with standard unit tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ring_buffer_basic_operations() {
        let mut rb = RingBuffer::new(4);

        assert!(rb.is_empty());
        assert!(!rb.is_full());

        rb.push(1).unwrap();
        rb.push(2).unwrap();
        rb.push(3).unwrap();

        // Capacity 4 means we can store 3 elements (one slot for full detection)
        assert!(rb.is_full());
        assert_eq!(rb.push(4), Err(4));

        assert_eq!(rb.pop(), Some(1));
        assert_eq!(rb.pop(), Some(2));
        assert_eq!(rb.pop(), Some(3));
        assert_eq!(rb.pop(), None);
    }

    #[test]
    fn ring_buffer_wraparound() {
        let mut rb = RingBuffer::new(4);

        // Fill and drain multiple times to test wraparound
        for round in 0..10 {
            for i in 0..3 {
                rb.push(round * 10 + i).unwrap();
            }
            for i in 0..3 {
                assert_eq!(rb.pop(), Some(round * 10 + i));
            }
        }
    }

    #[test]
    fn ring_buffer_drops_elements() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        use std::sync::Arc;

        static DROP_COUNT: AtomicUsize = AtomicUsize::new(0);

        #[derive(Clone)]
        struct DropCounter(Arc<()>);

        impl Drop for DropCounter {
            fn drop(&mut self) {
                DROP_COUNT.fetch_add(1, Ordering::SeqCst);
            }
        }

        DROP_COUNT.store(0, Ordering::SeqCst);

        {
            let mut rb = RingBuffer::new(4);
            rb.push(DropCounter(Arc::new(()))).unwrap();
            rb.push(DropCounter(Arc::new(()))).unwrap();
            rb.push(DropCounter(Arc::new(()))).unwrap();
            // Drop rb with elements still inside
        }

        // All 3 elements should have been dropped
        assert_eq!(DROP_COUNT.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn spinlock_basic() {
        let lock = SpinLock::new(42);

        {
            let mut guard = lock.lock();
            assert_eq!(*guard, 42);
            *guard = 100;
        }

        {
            let guard = lock.lock();
            assert_eq!(*guard, 100);
        }
    }
}
```

## Using Miri for Undefined Behavior Detection

Miri is an interpreter for Rust's mid-level IR that can detect undefined behavior. It catches issues like:

- Use after free
- Double free
- Invalid pointer dereferences
- Data races
- Violations of aliasing rules

Install and run Miri:

```bash
# Install Miri
rustup +nightly component add miri

# Run tests under Miri
cargo +nightly miri test

# Run a specific test
cargo +nightly miri test ring_buffer_basic_operations

# Run with stricter checks
MIRIFLAGS="-Zmiri-strict-provenance" cargo +nightly miri test
```

Here's a test specifically designed to catch UB that Miri would detect:

```rust
#[cfg(test)]
mod miri_tests {
    use super::*;

    // This test is designed to stress-test the ring buffer
    // under Miri's watchful eye
    #[test]
    fn ring_buffer_miri_stress() {
        let mut rb: RingBuffer<Box<i32>> = RingBuffer::new(8);

        // Interleave pushes and pops with heap-allocated values
        // Miri will catch any use-after-free or double-free
        for i in 0..100 {
            if i % 3 != 0 && !rb.is_full() {
                rb.push(Box::new(i)).unwrap();
            }
            if i % 2 == 0 && !rb.is_empty() {
                let _ = rb.pop();
            }
        }
    }

    #[test]
    fn buffer_from_raw_parts_miri() {
        let layout = std::alloc::Layout::array::<String>(4).unwrap();

        // SAFETY: Creating a valid buffer for Miri to verify
        let ptr = unsafe { std::alloc::alloc(layout) as *mut String };

        // Initialize elements
        for i in 0..3 {
            // SAFETY: ptr is valid, we're within bounds
            unsafe {
                ptr.add(i).write(format!("element {}", i));
            }
        }

        // SAFETY: ptr was allocated with global allocator,
        // has capacity 4, first 3 elements are initialized
        let buffer = unsafe { Buffer::from_raw_parts(ptr, 3, 4) };

        // Miri verifies this drop is correct
        drop(buffer);
    }
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Forgetting to Initialize Memory

```rust
// BAD: Reading uninitialized memory
let ptr: *mut i32 = unsafe { std::alloc::alloc(layout) as *mut i32 };
let value = unsafe { *ptr };  // UB! Memory not initialized

// GOOD: Initialize before reading
let ptr: *mut i32 = unsafe { std::alloc::alloc(layout) as *mut i32 };
unsafe { ptr.write(42); }
let value = unsafe { *ptr };  // OK
```

### Pitfall 2: Aliasing Violations

```rust
// BAD: Creating two mutable references
let mut data = 42;
let ptr = &mut data as *mut i32;
let ref1 = unsafe { &mut *ptr };
let ref2 = unsafe { &mut *ptr };  // UB! Two mutable refs exist
*ref1 = 1;
*ref2 = 2;

// GOOD: Only one mutable reference at a time
let mut data = 42;
let ptr = &mut data as *mut i32;
unsafe { *ptr = 1; }  // Direct write through pointer
unsafe { *ptr = 2; }  // No overlapping references
```

### Pitfall 3: Incorrect Drop Order

```rust
// BAD: Deallocating before dropping contents
impl<T> Drop for BadVec<T> {
    fn drop(&mut self) {
        // Deallocate first - now we can't access elements!
        unsafe { std::alloc::dealloc(self.ptr as *mut u8, self.layout); }

        // This would be use-after-free!
        // for i in 0..self.len {
        //     unsafe { self.ptr.add(i).drop_in_place(); }
        // }
    }
}

// GOOD: Drop contents, then deallocate
impl<T> Drop for GoodVec<T> {
    fn drop(&mut self) {
        // Drop all elements first
        for i in 0..self.len {
            // SAFETY: Elements 0..len are initialized
            unsafe { self.ptr.add(i).drop_in_place(); }
        }

        // Now safe to deallocate
        // SAFETY: Buffer is now logically empty
        unsafe { std::alloc::dealloc(self.ptr as *mut u8, self.layout); }
    }
}
```

## A Complete Example: Safe Wrapper for C String

Let's put it all together with a practical example, a safe wrapper for null-terminated C strings:

```rust
use std::ffi::CStr;
use std::marker::PhantomData;
use std::ptr::NonNull;

/// An owned, null-terminated C string.
///
/// # Safety Invariants
/// - `ptr` points to a valid, null-terminated sequence of bytes
/// - The allocation was made with the global allocator
/// - `len` is the length including the null terminator
/// - The string contains no interior null bytes
pub struct OwnedCString {
    ptr: NonNull<u8>,
    len: usize,  // Includes null terminator
    _marker: PhantomData<u8>,
}

// SAFETY: OwnedCString owns its data and has no interior mutability
unsafe impl Send for OwnedCString {}
unsafe impl Sync for OwnedCString {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CStringError {
    NullByte(usize),
    AllocationFailed,
}

impl OwnedCString {
    /// Creates a new OwnedCString from a Rust string slice.
    ///
    /// Returns an error if the string contains null bytes.
    pub fn new(s: &str) -> Result<Self, CStringError> {
        // Check for interior null bytes
        if let Some(pos) = s.bytes().position(|b| b == 0) {
            return Err(CStringError::NullByte(pos));
        }

        let len = s.len() + 1;  // +1 for null terminator
        let layout = std::alloc::Layout::array::<u8>(len)
            .map_err(|_| CStringError::AllocationFailed)?;

        // SAFETY: layout has non-zero size (len >= 1)
        let ptr = unsafe { std::alloc::alloc(layout) };

        if ptr.is_null() {
            return Err(CStringError::AllocationFailed);
        }

        // SAFETY: ptr is valid, non-null, and has space for len bytes
        unsafe {
            std::ptr::copy_nonoverlapping(s.as_ptr(), ptr, s.len());
            *ptr.add(s.len()) = 0;  // Null terminator
        }

        Ok(Self {
            // SAFETY: We just verified ptr is non-null
            ptr: unsafe { NonNull::new_unchecked(ptr) },
            len,
            _marker: PhantomData,
        })
    }

    /// Returns the string as a CStr reference.
    pub fn as_c_str(&self) -> &CStr {
        // SAFETY: Our invariants guarantee a valid null-terminated string
        unsafe { CStr::from_ptr(self.ptr.as_ptr() as *const i8) }
    }

    /// Returns the raw pointer for FFI use.
    ///
    /// The pointer remains valid for the lifetime of this OwnedCString.
    pub fn as_ptr(&self) -> *const i8 {
        self.ptr.as_ptr() as *const i8
    }

    /// Returns the length without the null terminator.
    pub fn len(&self) -> usize {
        self.len - 1
    }

    /// Consumes self and returns the raw pointer.
    ///
    /// The caller is responsible for freeing the memory by calling
    /// `OwnedCString::from_raw`.
    pub fn into_raw(self) -> *mut i8 {
        let ptr = self.ptr.as_ptr() as *mut i8;
        std::mem::forget(self);
        ptr
    }

    /// Reconstructs an OwnedCString from a raw pointer.
    ///
    /// # Safety
    ///
    /// - `ptr` must have been returned by `into_raw`
    /// - `ptr` must not have been freed or used to construct another OwnedCString
    pub unsafe fn from_raw(ptr: *mut i8) -> Self {
        // SAFETY: Caller guarantees ptr is valid and from into_raw
        let c_str = CStr::from_ptr(ptr);
        let len = c_str.to_bytes_with_nul().len();

        Self {
            ptr: NonNull::new_unchecked(ptr as *mut u8),
            len,
            _marker: PhantomData,
        }
    }
}

impl Drop for OwnedCString {
    fn drop(&mut self) {
        let layout = std::alloc::Layout::array::<u8>(self.len)
            .expect("layout was valid at construction");

        // SAFETY: ptr was allocated with this layout, and we're the owner
        unsafe {
            std::alloc::dealloc(self.ptr.as_ptr(), layout);
        }
    }
}

impl std::fmt::Debug for OwnedCString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.as_c_str().fmt(f)
    }
}

#[cfg(test)]
mod owned_cstring_tests {
    use super::*;

    #[test]
    fn basic_creation() {
        let s = OwnedCString::new("hello").unwrap();
        assert_eq!(s.len(), 5);
        assert_eq!(s.as_c_str().to_str().unwrap(), "hello");
    }

    #[test]
    fn rejects_interior_null() {
        let result = OwnedCString::new("hel\0lo");
        assert_eq!(result.unwrap_err(), CStringError::NullByte(3));
    }

    #[test]
    fn empty_string() {
        let s = OwnedCString::new("").unwrap();
        assert_eq!(s.len(), 0);
        assert_eq!(s.as_c_str().to_str().unwrap(), "");
    }

    #[test]
    fn roundtrip_through_raw() {
        let original = OwnedCString::new("test string").unwrap();
        let ptr = original.into_raw();

        // SAFETY: ptr came from into_raw and hasn't been used
        let recovered = unsafe { OwnedCString::from_raw(ptr) };
        assert_eq!(recovered.as_c_str().to_str().unwrap(), "test string");
    }
}
```

## Summary

Building safe wrappers for unsafe code follows a consistent pattern:

1. **Identify invariants**: What must always be true for your unsafe operations to be sound?

2. **Enforce invariants at the boundary**: Use the type system, assertions, and careful API design to make it impossible for safe code to violate your invariants.

3. **Document everything**: SAFETY comments on every unsafe block. Safety requirements on every unsafe function.

4. **Use the right tools**: `PhantomData` for variance, `NonNull` for non-null pointers, `UnsafeCell` for interior mutability.

5. **Test thoroughly**: Unit tests for correctness, Miri for undefined behavior, property tests for edge cases.

6. **Keep unsafe blocks minimal**: The less code inside unsafe blocks, the less code you need to audit.

The goal is not to avoid unsafe code entirely. The goal is to contain it behind safe abstractions that are easy to verify and impossible to misuse. When done right, your users get the performance benefits of unsafe code with the safety guarantees of safe Rust.
