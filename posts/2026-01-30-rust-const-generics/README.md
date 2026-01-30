# How to Create Const Generics in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Generics, Type System, Performance

Description: Master const generics in Rust for compile-time array sizes, fixed-capacity buffers, and type-level computations with practical examples.

---

Const generics allow you to parameterize types and functions by constant values known at compile time. Before const generics, Rust developers had to implement traits separately for each array size or rely on macros to generate repetitive code. With const generics, you write the code once and let the compiler generate specialized versions for each constant value.

## What Are Const Generics?

Const generics extend Rust's generic system to include constant values as parameters. While regular generics let you write code that works with any type, const generics let you write code that works with any constant value of a specific type.

Here is a comparison between regular generics and const generics:

| Feature | Regular Generics | Const Generics |
|---------|-----------------|----------------|
| Parameter | Type (`T`, `U`) | Constant value (`N`, `M`) |
| Resolved at | Compile time (monomorphization) | Compile time |
| Example | `Vec<T>` | `[T; N]` |
| Allowed types | Any type | Integers, `bool`, `char` |
| Primary use | Type abstraction | Size abstraction |

## Basic Const Generic Syntax

The basic syntax places a `const` parameter inside angle brackets, followed by the parameter name and its type.

This example shows a function that accepts arrays of any size:

```rust
// The const generic parameter N represents the array length
// It must be a usize since array lengths are always usize
fn print_array<const N: usize>(arr: [i32; N]) {
    print!("[");
    for (i, item) in arr.iter().enumerate() {
        if i > 0 {
            print!(", ");
        }
        print!("{}", item);
    }
    println!("]");
}

fn main() {
    let small = [1, 2, 3];
    let large = [10, 20, 30, 40, 50];

    // The compiler infers N=3 for the first call
    print_array(small);  // Output: [1, 2, 3]

    // The compiler infers N=5 for the second call
    print_array(large);  // Output: [10, 20, 30, 40, 50]
}
```

You can also use const generics in struct definitions. This creates a fixed-size buffer type:

```rust
// A buffer with compile-time known capacity
// The compiler generates different types for different N values
struct FixedBuffer<T, const N: usize> {
    data: [T; N],
    len: usize,
}

impl<T: Default + Copy, const N: usize> FixedBuffer<T, N> {
    // Create a new empty buffer
    // The array is initialized with default values
    fn new() -> Self {
        FixedBuffer {
            data: [T::default(); N],
            len: 0,
        }
    }

    // Add an element if there is room
    // Returns Err if the buffer is full
    fn push(&mut self, value: T) -> Result<(), &'static str> {
        if self.len >= N {
            return Err("Buffer is full");
        }
        self.data[self.len] = value;
        self.len += 1;
        Ok(())
    }

    // Get the current number of elements
    fn len(&self) -> usize {
        self.len
    }

    // Get the maximum capacity (known at compile time)
    const fn capacity(&self) -> usize {
        N
    }
}

fn main() {
    // Create a buffer that can hold exactly 4 integers
    let mut buf: FixedBuffer<i32, 4> = FixedBuffer::new();

    buf.push(10).unwrap();
    buf.push(20).unwrap();
    buf.push(30).unwrap();
    buf.push(40).unwrap();

    // This would fail at runtime since the buffer is full
    assert!(buf.push(50).is_err());

    println!("Length: {}, Capacity: {}", buf.len(), buf.capacity());
}
```

## Array-Size Generics

The most common use case for const generics is working with arrays. Before const generics, you could not write a single function that worked with arrays of different sizes.

This example shows how to implement array operations generically:

```rust
// Sum all elements in an array of any size
fn sum_array<const N: usize>(arr: [i32; N]) -> i32 {
    let mut total = 0;
    for item in arr {
        total += item;
    }
    total
}

// Find the maximum element in a non-empty array
// The where clause ensures N is at least 1
fn max_array<const N: usize>(arr: [i32; N]) -> i32
where
    [(); N - 1]:,  // This constraint ensures N >= 1
{
    let mut max = arr[0];
    for i in 1..N {
        if arr[i] > max {
            max = arr[i];
        }
    }
    max
}

// Reverse an array, returning a new array
fn reverse_array<T: Copy, const N: usize>(arr: [T; N]) -> [T; N] {
    let mut result = arr;
    let mut left = 0;
    let mut right = N.saturating_sub(1);

    while left < right {
        result.swap(left, right);
        left += 1;
        right -= 1;
    }
    result
}

fn main() {
    let numbers = [5, 2, 8, 1, 9];

    println!("Sum: {}", sum_array(numbers));        // Output: 25
    println!("Max: {}", max_array(numbers));        // Output: 9
    println!("Reversed: {:?}", reverse_array(numbers));  // Output: [9, 1, 8, 2, 5]
}
```

## Combining Multiple Const Generics

You can use multiple const generic parameters when a type depends on more than one constant value. Matrix operations are a good example:

```rust
// A matrix with compile-time known dimensions
// ROWS and COLS are separate const generic parameters
#[derive(Debug, Clone, Copy)]
struct Matrix<T, const ROWS: usize, const COLS: usize> {
    data: [[T; COLS]; ROWS],
}

impl<T: Default + Copy, const ROWS: usize, const COLS: usize> Matrix<T, ROWS, COLS> {
    // Create a matrix filled with default values
    fn new() -> Self {
        Matrix {
            data: [[T::default(); COLS]; ROWS],
        }
    }

    // Create a matrix from a 2D array
    fn from_array(data: [[T; COLS]; ROWS]) -> Self {
        Matrix { data }
    }

    // Get an element at the specified position
    fn get(&self, row: usize, col: usize) -> Option<&T> {
        self.data.get(row).and_then(|r| r.get(col))
    }

    // Set an element at the specified position
    fn set(&mut self, row: usize, col: usize, value: T) {
        if row < ROWS && col < COLS {
            self.data[row][col] = value;
        }
    }

    // Get the dimensions as a tuple
    const fn dimensions(&self) -> (usize, usize) {
        (ROWS, COLS)
    }
}

// Transpose operation: swap rows and columns
// Notice how the output type has swapped dimensions
impl<T: Default + Copy, const ROWS: usize, const COLS: usize> Matrix<T, ROWS, COLS> {
    fn transpose(&self) -> Matrix<T, COLS, ROWS> {
        let mut result = Matrix::new();
        for i in 0..ROWS {
            for j in 0..COLS {
                result.data[j][i] = self.data[i][j];
            }
        }
        result
    }
}

// Matrix multiplication requires matching inner dimensions
// A (M x N) matrix times a (N x P) matrix produces an (M x P) matrix
impl<const M: usize, const N: usize> Matrix<i32, M, N> {
    fn multiply<const P: usize>(&self, other: &Matrix<i32, N, P>) -> Matrix<i32, M, P> {
        let mut result = Matrix::new();

        for i in 0..M {
            for j in 0..P {
                let mut sum = 0;
                for k in 0..N {
                    sum += self.data[i][k] * other.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        result
    }
}

fn main() {
    // Create a 2x3 matrix
    let a: Matrix<i32, 2, 3> = Matrix::from_array([
        [1, 2, 3],
        [4, 5, 6],
    ]);

    // Create a 3x2 matrix
    let b: Matrix<i32, 3, 2> = Matrix::from_array([
        [7, 8],
        [9, 10],
        [11, 12],
    ]);

    // Multiply them to get a 2x2 matrix
    let c = a.multiply(&b);

    println!("Matrix A (2x3): {:?}", a.data);
    println!("Matrix B (3x2): {:?}", b.data);
    println!("A * B (2x2): {:?}", c.data);

    // Transpose A to get a 3x2 matrix
    let a_transposed = a.transpose();
    println!("A transposed (3x2): {:?}", a_transposed.data);
}
```

## Default Const Values

Rust allows you to specify default values for const generic parameters. This feature makes APIs more convenient when there is a sensible default:

```rust
// A ring buffer with a default size of 16
// Users can override this by specifying a different N
struct RingBuffer<T, const N: usize = 16> {
    buffer: [Option<T>; N],
    head: usize,
    tail: usize,
    count: usize,
}

impl<T: Copy, const N: usize> RingBuffer<T, N> {
    // Initialize an empty ring buffer
    // We use const {} block to create a compile-time array of None values
    fn new() -> Self {
        RingBuffer {
            buffer: [None; N],
            head: 0,
            tail: 0,
            count: 0,
        }
    }

    // Add an element to the back of the buffer
    // Overwrites the oldest element if the buffer is full
    fn push(&mut self, value: T) {
        self.buffer[self.tail] = Some(value);
        self.tail = (self.tail + 1) % N;

        if self.count < N {
            self.count += 1;
        } else {
            // Buffer was full, move head forward
            self.head = (self.head + 1) % N;
        }
    }

    // Remove and return the oldest element
    fn pop(&mut self) -> Option<T> {
        if self.count == 0 {
            return None;
        }

        let value = self.buffer[self.head].take();
        self.head = (self.head + 1) % N;
        self.count -= 1;
        value
    }

    // Check if the buffer is empty
    fn is_empty(&self) -> bool {
        self.count == 0
    }

    // Check if the buffer is full
    fn is_full(&self) -> bool {
        self.count == N
    }

    // Get the current number of elements
    fn len(&self) -> usize {
        self.count
    }
}

fn main() {
    // Use the default size of 16
    let mut default_buffer: RingBuffer<i32> = RingBuffer::new();

    // Specify a custom size of 4
    let mut small_buffer: RingBuffer<i32, 4> = RingBuffer::new();

    // Fill the small buffer
    for i in 0..6 {
        small_buffer.push(i);
        println!("Pushed {}, length: {}", i, small_buffer.len());
    }

    // The buffer only holds 4 elements, so 0 and 1 were overwritten
    println!("\nPopping elements:");
    while let Some(value) = small_buffer.pop() {
        println!("Popped: {}", value);
    }
}
```

## Const Generic Bounds and Where Clauses

You can add constraints to const generic parameters using where clauses. These constraints are evaluated at compile time:

```rust
use std::mem::MaybeUninit;

// A stack-allocated vector with a maximum capacity
// The where clause documents the minimum size requirement
struct SmallVec<T, const N: usize>
where
    [T; N]:,  // Ensures T can form an array of size N
{
    data: [MaybeUninit<T>; N],
    len: usize,
}

impl<T, const N: usize> SmallVec<T, N>
where
    [T; N]:,
{
    // Create a new empty SmallVec
    fn new() -> Self {
        SmallVec {
            // SAFETY: MaybeUninit does not require initialization
            data: unsafe { MaybeUninit::uninit().assume_init() },
            len: 0,
        }
    }

    // Add an element to the end
    fn push(&mut self, value: T) -> Result<(), T> {
        if self.len >= N {
            return Err(value);
        }

        self.data[self.len] = MaybeUninit::new(value);
        self.len += 1;
        Ok(())
    }

    // Remove the last element
    fn pop(&mut self) -> Option<T> {
        if self.len == 0 {
            return None;
        }

        self.len -= 1;
        // SAFETY: We know this index was initialized
        Some(unsafe { self.data[self.len].assume_init_read() })
    }

    // Get a reference to an element
    fn get(&self, index: usize) -> Option<&T> {
        if index >= self.len {
            return None;
        }
        // SAFETY: We know indices less than len are initialized
        Some(unsafe { self.data[index].assume_init_ref() })
    }

    fn len(&self) -> usize {
        self.len
    }

    fn is_empty(&self) -> bool {
        self.len == 0
    }
}

// Properly drop initialized elements
impl<T, const N: usize> Drop for SmallVec<T, N>
where
    [T; N]:,
{
    fn drop(&mut self) {
        // Drop all initialized elements
        for i in 0..self.len {
            unsafe {
                self.data[i].assume_init_drop();
            }
        }
    }
}

fn main() {
    let mut vec: SmallVec<String, 3> = SmallVec::new();

    vec.push(String::from("hello")).unwrap();
    vec.push(String::from("world")).unwrap();
    vec.push(String::from("!")).unwrap();

    // This would fail since we are at capacity
    let result = vec.push(String::from("overflow"));
    assert!(result.is_err());

    // Access elements
    for i in 0..vec.len() {
        println!("Element {}: {}", i, vec.get(i).unwrap());
    }
}
```

## Practical Example: Fixed-Size Buffers

Here is a more complete example of a fixed-size buffer suitable for embedded systems or performance-critical code:

```rust
use std::fmt::Debug;

// A fixed-capacity buffer that never allocates
// Useful for embedded systems or when avoiding heap allocation
#[derive(Clone)]
pub struct StaticBuffer<T: Copy + Default, const CAPACITY: usize> {
    storage: [T; CAPACITY],
    write_pos: usize,
}

impl<T: Copy + Default, const CAPACITY: usize> StaticBuffer<T, CAPACITY> {
    // Create a new buffer with all elements set to default
    pub const fn new() -> Self {
        StaticBuffer {
            storage: [T::default(); CAPACITY],
            write_pos: 0,
        }
    }

    // Write data to the buffer, returning how many elements were written
    pub fn write(&mut self, data: &[T]) -> usize {
        let available = CAPACITY - self.write_pos;
        let to_write = data.len().min(available);

        for i in 0..to_write {
            self.storage[self.write_pos + i] = data[i];
        }
        self.write_pos += to_write;

        to_write
    }

    // Read all written data as a slice
    pub fn as_slice(&self) -> &[T] {
        &self.storage[..self.write_pos]
    }

    // Clear the buffer
    pub fn clear(&mut self) {
        self.write_pos = 0;
    }

    // Get the number of elements written
    pub fn len(&self) -> usize {
        self.write_pos
    }

    // Check if the buffer is empty
    pub fn is_empty(&self) -> bool {
        self.write_pos == 0
    }

    // Get the remaining capacity
    pub fn remaining(&self) -> usize {
        CAPACITY - self.write_pos
    }

    // Get the total capacity
    pub const fn capacity(&self) -> usize {
        CAPACITY
    }
}

impl<T: Copy + Default + Debug, const CAPACITY: usize> Debug for StaticBuffer<T, CAPACITY> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("StaticBuffer")
            .field("data", &self.as_slice())
            .field("capacity", &CAPACITY)
            .finish()
    }
}

// Allow creating a buffer from an array
impl<T: Copy + Default, const N: usize> From<[T; N]> for StaticBuffer<T, N> {
    fn from(arr: [T; N]) -> Self {
        StaticBuffer {
            storage: arr,
            write_pos: N,
        }
    }
}

fn main() {
    // Create a 64-byte buffer
    let mut buf: StaticBuffer<u8, 64> = StaticBuffer::new();

    // Write some data
    let data = b"Hello, const generics!";
    let written = buf.write(data);

    println!("Wrote {} bytes", written);
    println!("Buffer contents: {:?}", buf.as_slice());
    println!("Remaining space: {} bytes", buf.remaining());

    // Create a buffer from an existing array
    let arr = [1, 2, 3, 4, 5];
    let buf2: StaticBuffer<i32, 5> = StaticBuffer::from(arr);
    println!("\nBuffer from array: {:?}", buf2);
}
```

## Practical Example: Type-Safe Unit Conversions

Const generics can encode units at the type level, catching unit mismatch errors at compile time:

```rust
use std::ops::{Add, Mul};
use std::marker::PhantomData;

// Dimensional analysis using const generics
// Each const parameter represents an exponent in SI base units
// LENGTH, MASS, TIME represent meters, kilograms, seconds respectively
#[derive(Debug, Clone, Copy)]
struct Quantity<const LENGTH: i32, const MASS: i32, const TIME: i32> {
    value: f64,
}

// Type aliases for common quantities
type Scalar = Quantity<0, 0, 0>;        // Dimensionless
type Length = Quantity<1, 0, 0>;        // meters
type Mass = Quantity<0, 1, 0>;          // kilograms
type Time = Quantity<0, 0, 1>;          // seconds
type Velocity = Quantity<1, 0, -1>;     // meters per second
type Acceleration = Quantity<1, 0, -2>; // meters per second squared
type Force = Quantity<1, 1, -2>;        // newtons (kg * m / s^2)
type Area = Quantity<2, 0, 0>;          // square meters

impl<const L: i32, const M: i32, const T: i32> Quantity<L, M, T> {
    // Create a new quantity with the given value
    pub fn new(value: f64) -> Self {
        Quantity { value }
    }

    // Get the raw value
    pub fn value(&self) -> f64 {
        self.value
    }
}

// Addition: only quantities with the same dimensions can be added
impl<const L: i32, const M: i32, const T: i32> Add for Quantity<L, M, T> {
    type Output = Quantity<L, M, T>;

    fn add(self, other: Self) -> Self::Output {
        Quantity::new(self.value + other.value)
    }
}

// Multiplication: dimensions are added
// Unfortunately, we cannot express L1 + L2 directly in stable Rust
// So we provide specific implementations for common cases
impl Mul<Time> for Velocity {
    type Output = Length;

    fn mul(self, time: Time) -> Length {
        Length::new(self.value * time.value)
    }
}

impl Mul<Acceleration> for Mass {
    type Output = Force;

    fn mul(self, accel: Acceleration) -> Force {
        Force::new(self.value * accel.value)
    }
}

impl Mul<Length> for Length {
    type Output = Area;

    fn mul(self, other: Length) -> Area {
        Area::new(self.value * other.value)
    }
}

impl Mul<Scalar> for Length {
    type Output = Length;

    fn mul(self, scalar: Scalar) -> Length {
        Length::new(self.value * scalar.value)
    }
}

fn main() {
    // Create some quantities
    let distance = Length::new(100.0);      // 100 meters
    let time = Time::new(9.58);             // 9.58 seconds (Usain Bolt's record)
    let mass = Mass::new(86.0);             // 86 kilograms

    // Calculate average velocity
    let avg_velocity = Velocity::new(distance.value() / time.value());
    println!("Average velocity: {:.2} m/s", avg_velocity.value());

    // Calculate how far you travel in a given time
    let travel_time = Time::new(5.0);
    let travel_distance = avg_velocity * travel_time;
    println!("Distance in 5s: {:.2} meters", travel_distance.value());

    // Calculate force using F = m * a
    let gravity = Acceleration::new(9.81);
    let weight = mass * gravity;
    println!("Weight: {:.2} newtons", weight.value());

    // Calculate area
    let width = Length::new(10.0);
    let height = Length::new(5.0);
    let area = width * height;
    println!("Area: {:.2} square meters", area.value());

    // This would not compile because you cannot add Length and Time:
    // let invalid = distance + time;  // Compile error!

    // Adding same dimensions works
    let total_distance = distance + Length::new(50.0);
    println!("Total distance: {:.2} meters", total_distance.value());
}
```

## Const Generics with Traits

You can use const generics in trait definitions and implementations:

```rust
// A trait for types that have a fixed size known at compile time
trait FixedSize {
    const SIZE: usize;

    fn size(&self) -> usize {
        Self::SIZE
    }
}

// Implement for arrays of any size
impl<T, const N: usize> FixedSize for [T; N] {
    const SIZE: usize = N;
}

// A trait for converting between different array sizes
trait Resize<const M: usize> {
    type Output;
    fn resize(self) -> Self::Output;
}

// Implement resizing from any size N to any size M
impl<T: Default + Copy, const N: usize, const M: usize> Resize<M> for [T; N] {
    type Output = [T; M];

    fn resize(self) -> [T; M] {
        let mut result = [T::default(); M];
        let copy_len = N.min(M);

        for i in 0..copy_len {
            result[i] = self[i];
        }
        result
    }
}

// A trait for splitting arrays
trait Split<const SPLIT_AT: usize> {
    type Left;
    type Right;

    fn split(self) -> (Self::Left, Self::Right);
}

// Split an array of size N into two arrays
impl<T: Copy + Default, const N: usize, const SPLIT_AT: usize> Split<SPLIT_AT> for [T; N]
where
    [T; SPLIT_AT]:,
    [T; N - SPLIT_AT]:,
{
    type Left = [T; SPLIT_AT];
    type Right = [T; N - SPLIT_AT];

    fn split(self) -> (Self::Left, Self::Right) {
        let mut left = [T::default(); SPLIT_AT];
        let mut right = [T::default(); N - SPLIT_AT];

        for i in 0..SPLIT_AT {
            left[i] = self[i];
        }
        for i in SPLIT_AT..N {
            right[i - SPLIT_AT] = self[i];
        }

        (left, right)
    }
}

fn main() {
    // FixedSize examples
    let arr: [i32; 5] = [1, 2, 3, 4, 5];
    println!("Array size: {}", arr.size());

    // Resize examples
    let small: [i32; 3] = [1, 2, 3];
    let larger: [i32; 5] = small.resize();
    println!("Resized to larger: {:?}", larger);  // [1, 2, 3, 0, 0]

    let large: [i32; 5] = [1, 2, 3, 4, 5];
    let smaller: [i32; 3] = large.resize();
    println!("Resized to smaller: {:?}", smaller);  // [1, 2, 3]

    // Split examples
    let numbers: [i32; 6] = [1, 2, 3, 4, 5, 6];
    let (first_half, second_half): ([i32; 3], [i32; 3]) = numbers.split();
    println!("First half: {:?}", first_half);   // [1, 2, 3]
    println!("Second half: {:?}", second_half); // [4, 5, 6]
}
```

## Limitations of Const Generics

While const generics are powerful, they have some limitations you should understand:

### Supported Types

Currently, const generics only support these types:

| Type | Supported | Example |
|------|-----------|---------|
| `usize` | Yes | `const N: usize` |
| `isize` | Yes | `const N: isize` |
| `u8` - `u128` | Yes | `const N: u32` |
| `i8` - `i128` | Yes | `const N: i64` |
| `bool` | Yes | `const B: bool` |
| `char` | Yes | `const C: char` |
| `&str` | No | - |
| `String` | No | - |
| Structs | No | - |
| Floats | No | - |

### Arithmetic Expressions

Const generic arithmetic has limitations. Complex expressions may not work:

```rust
// This works: simple reference to const parameters
fn double_array<T: Copy + Default, const N: usize>(arr: [T; N]) -> [T; N] {
    arr
}

// This requires the generic_const_exprs feature (unstable)
// fn double_size<T: Copy + Default, const N: usize>(arr: [T; N]) -> [T; { N * 2 }] {
//     ...
// }

// Workaround: use a separate const parameter
fn combine_arrays<T: Copy + Default, const N: usize, const M: usize, const TOTAL: usize>(
    a: [T; N],
    b: [T; M],
) -> [T; TOTAL] {
    assert_eq!(N + M, TOTAL, "TOTAL must equal N + M");

    let mut result = [T::default(); TOTAL];
    for i in 0..N {
        result[i] = a[i];
    }
    for i in 0..M {
        result[N + i] = b[i];
    }
    result
}

fn main() {
    let a = [1, 2, 3];
    let b = [4, 5];

    // The user must specify the correct total
    let combined: [i32; 5] = combine_arrays(a, b);
    println!("Combined: {:?}", combined);  // [1, 2, 3, 4, 5]
}
```

### No Specialization

You cannot specialize implementations based on const generic values:

```rust
// This does NOT work - you cannot specialize on specific values
/*
impl<T> MyStruct<T, 0> {
    fn special_zero_case() {}
}

impl<T, const N: usize> MyStruct<T, N> {
    fn general_case() {}
}
*/

// Workaround: use conditional logic inside methods
struct ConditionalBuffer<T, const N: usize> {
    data: [T; N],
}

impl<T: Default + Copy, const N: usize> ConditionalBuffer<T, N> {
    fn behavior(&self) -> &'static str {
        // Runtime check instead of compile-time specialization
        if N == 0 {
            "empty buffer"
        } else if N == 1 {
            "single element"
        } else {
            "multiple elements"
        }
    }
}
```

## Performance Considerations

Const generics enable compile-time optimizations that would not be possible otherwise:

```rust
use std::time::Instant;

// The compiler can unroll loops when N is known at compile time
fn sum_unrolled<const N: usize>(arr: &[i32; N]) -> i32 {
    let mut sum = 0;
    for i in 0..N {
        sum += arr[i];
    }
    sum
}

// SIMD-friendly operations become possible with known sizes
fn dot_product<const N: usize>(a: &[f32; N], b: &[f32; N]) -> f32 {
    let mut sum = 0.0;
    for i in 0..N {
        sum += a[i] * b[i];
    }
    sum
}

// The compiler generates specialized code for each size
fn benchmark_sizes() {
    let arr_small: [i32; 8] = [1; 8];
    let arr_medium: [i32; 64] = [1; 64];
    let arr_large: [i32; 512] = [1; 512];

    // Each call uses optimized code for that specific size
    let sum_small = sum_unrolled(&arr_small);
    let sum_medium = sum_unrolled(&arr_medium);
    let sum_large = sum_unrolled(&arr_large);

    println!("Sum small (8): {}", sum_small);
    println!("Sum medium (64): {}", sum_medium);
    println!("Sum large (512): {}", sum_large);
}

fn main() {
    benchmark_sizes();

    // Dot product example
    let a = [1.0f32, 2.0, 3.0, 4.0];
    let b = [5.0f32, 6.0, 7.0, 8.0];
    let result = dot_product(&a, &b);
    println!("Dot product: {}", result);  // 70.0
}
```

## Summary

Const generics are a powerful feature that lets you write generic code parameterized by constant values. Key takeaways:

1. Use `const N: usize` syntax to declare const generic parameters
2. Const generics work with integers, bool, and char types
3. Default values simplify APIs with `const N: usize = 16`
4. Where clauses can constrain const generic parameters
5. Matrix operations, fixed-size buffers, and type-safe units are common use cases
6. The compiler generates specialized code for each const value, enabling optimizations
7. Arithmetic in const generics is limited on stable Rust

Const generics eliminate the need for macros that generate code for multiple array sizes and enable type-safe APIs that catch errors at compile time rather than runtime.
