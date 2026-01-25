# How to Use unittest Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, unittest, Testing, Test Automation, TDD, Quality Assurance

Description: Learn how to write effective tests using Python's built-in unittest module. This guide covers test cases, assertions, fixtures, mocking, and best practices for test organization.

---

> Python's unittest module provides a solid framework for writing and organizing tests. Built into the standard library, it offers test discovery, fixtures, assertions, and mocking capabilities without requiring external dependencies.

This guide covers unittest fundamentals and advanced patterns to help you write effective, maintainable tests.

---

## Getting Started

### Basic Test Structure

```python
# test_basic.py
# Basic unittest example
import unittest

def add(a, b):
    """Add two numbers."""
    return a + b

def divide(a, b):
    """Divide a by b."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

class TestMathOperations(unittest.TestCase):
    """Test cases for math operations."""

    def test_add_positive_numbers(self):
        """Test adding two positive numbers."""
        result = add(2, 3)
        self.assertEqual(result, 5)

    def test_add_negative_numbers(self):
        """Test adding negative numbers."""
        result = add(-2, -3)
        self.assertEqual(result, -5)

    def test_add_mixed_numbers(self):
        """Test adding positive and negative numbers."""
        result = add(5, -3)
        self.assertEqual(result, 2)

    def test_divide_numbers(self):
        """Test division of two numbers."""
        result = divide(10, 2)
        self.assertEqual(result, 5.0)

    def test_divide_by_zero_raises_error(self):
        """Test that dividing by zero raises ValueError."""
        with self.assertRaises(ValueError):
            divide(10, 0)

# Run tests when file is executed directly
if __name__ == '__main__':
    unittest.main()
```

### Running Tests

```bash
# Run specific test file
python -m unittest test_basic.py

# Run specific test class
python -m unittest test_basic.TestMathOperations

# Run specific test method
python -m unittest test_basic.TestMathOperations.test_add_positive_numbers

# Run with verbose output
python -m unittest -v test_basic.py

# Discover and run all tests
python -m unittest discover -s tests -p "test_*.py"
```

---

## Assertions

```python
# test_assertions.py
# Available assertions in unittest
import unittest

class TestAssertions(unittest.TestCase):
    """Examples of unittest assertions."""

    def test_equality(self):
        """Test equality assertions."""
        self.assertEqual(1 + 1, 2)
        self.assertNotEqual(1 + 1, 3)

    def test_boolean(self):
        """Test boolean assertions."""
        self.assertTrue(1 < 2)
        self.assertFalse(1 > 2)

    def test_none(self):
        """Test None assertions."""
        result = None
        self.assertIsNone(result)

        result = "value"
        self.assertIsNotNone(result)

    def test_identity(self):
        """Test identity assertions."""
        a = [1, 2, 3]
        b = a
        c = [1, 2, 3]

        self.assertIs(a, b)      # Same object
        self.assertIsNot(a, c)   # Different objects

    def test_membership(self):
        """Test membership assertions."""
        items = [1, 2, 3, 4, 5]
        self.assertIn(3, items)
        self.assertNotIn(6, items)

    def test_type(self):
        """Test type assertions."""
        self.assertIsInstance("hello", str)
        self.assertNotIsInstance("hello", int)

    def test_comparison(self):
        """Test comparison assertions."""
        self.assertGreater(5, 3)
        self.assertGreaterEqual(5, 5)
        self.assertLess(3, 5)
        self.assertLessEqual(5, 5)

    def test_approximately_equal(self):
        """Test floating point comparisons."""
        result = 0.1 + 0.2
        self.assertAlmostEqual(result, 0.3, places=5)

    def test_sequences(self):
        """Test sequence comparisons."""
        expected = [1, 2, 3]
        actual = [1, 2, 3]
        self.assertListEqual(expected, actual)
        self.assertSequenceEqual(expected, actual)

        dict1 = {'a': 1, 'b': 2}
        dict2 = {'a': 1, 'b': 2}
        self.assertDictEqual(dict1, dict2)

    def test_regex(self):
        """Test regular expression matching."""
        self.assertRegex('hello world', r'hello \w+')
        self.assertNotRegex('hello world', r'goodbye')

    def test_exceptions(self):
        """Test exception handling."""
        # Check that exception is raised
        with self.assertRaises(ValueError):
            int('not a number')

        # Check exception message
        with self.assertRaises(ValueError) as context:
            int('not a number')
        self.assertIn('invalid literal', str(context.exception))

        # Check exception with regex
        with self.assertRaisesRegex(ValueError, r'invalid literal'):
            int('not a number')

    def test_warnings(self):
        """Test warning detection."""
        import warnings

        with self.assertWarns(DeprecationWarning):
            warnings.warn("This is deprecated", DeprecationWarning)
```

---

## Test Fixtures

### setUp and tearDown

```python
# test_fixtures.py
# Setting up and tearing down test fixtures
import unittest
import tempfile
import os

class TestWithFixtures(unittest.TestCase):
    """Tests using setUp and tearDown."""

    @classmethod
    def setUpClass(cls):
        """Run once before all tests in the class."""
        print("Setting up class fixtures")
        cls.shared_resource = "shared data"

    @classmethod
    def tearDownClass(cls):
        """Run once after all tests in the class."""
        print("Tearing down class fixtures")
        cls.shared_resource = None

    def setUp(self):
        """Run before each test method."""
        # Create a temporary file for testing
        self.temp_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.temp_dir, 'test.txt')
        with open(self.test_file, 'w') as f:
            f.write('test content')

    def tearDown(self):
        """Run after each test method."""
        # Clean up temporary files
        if os.path.exists(self.test_file):
            os.remove(self.test_file)
        os.rmdir(self.temp_dir)

    def test_file_exists(self):
        """Test that the file was created."""
        self.assertTrue(os.path.exists(self.test_file))

    def test_file_content(self):
        """Test the file content."""
        with open(self.test_file) as f:
            content = f.read()
        self.assertEqual(content, 'test content')

    def test_shared_resource(self):
        """Test access to class-level fixture."""
        self.assertEqual(self.shared_resource, "shared data")
```

### Using addCleanup

```python
# test_cleanup.py
# Using addCleanup for guaranteed cleanup
import unittest

class TestWithCleanup(unittest.TestCase):
    """Tests using addCleanup for reliable cleanup."""

    def test_with_cleanup(self):
        """Test that registers cleanup functions."""
        # Create resources
        resource1 = self.create_resource("resource1")
        self.addCleanup(self.cleanup_resource, resource1)

        resource2 = self.create_resource("resource2")
        self.addCleanup(self.cleanup_resource, resource2)

        # Even if test fails, cleanup functions will run
        self.assertIsNotNone(resource1)
        self.assertIsNotNone(resource2)

    def create_resource(self, name):
        """Create a resource for testing."""
        print(f"Creating {name}")
        return {"name": name}

    def cleanup_resource(self, resource):
        """Clean up a resource."""
        print(f"Cleaning up {resource['name']}")
```

---

## Mocking

### Using unittest.mock

```python
# test_mocking.py
# Mocking external dependencies
import unittest
from unittest.mock import Mock, patch, MagicMock

# Code to test
class UserService:
    def __init__(self, database, email_client):
        self.database = database
        self.email_client = email_client

    def create_user(self, email, name):
        """Create a user and send welcome email."""
        user = self.database.insert('users', {
            'email': email,
            'name': name
        })
        self.email_client.send(
            to=email,
            subject='Welcome!',
            body=f'Hello {name}!'
        )
        return user

class TestUserService(unittest.TestCase):
    """Tests for UserService using mocks."""

    def test_create_user_with_mocks(self):
        """Test user creation with mocked dependencies."""
        # Create mock objects
        mock_database = Mock()
        mock_email = Mock()

        # Configure mock return value
        mock_database.insert.return_value = {'id': 1, 'email': 'test@example.com'}

        # Create service with mocks
        service = UserService(mock_database, mock_email)

        # Call the method
        result = service.create_user('test@example.com', 'Test User')

        # Assert database was called correctly
        mock_database.insert.assert_called_once_with('users', {
            'email': 'test@example.com',
            'name': 'Test User'
        })

        # Assert email was sent
        mock_email.send.assert_called_once_with(
            to='test@example.com',
            subject='Welcome!',
            body='Hello Test User!'
        )

        # Assert return value
        self.assertEqual(result['id'], 1)

    @patch('requests.get')
    def test_with_patch_decorator(self, mock_get):
        """Test using patch as a decorator."""
        # Configure the mock
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {'data': 'test'}

        # Import and test the function that uses requests
        import requests
        response = requests.get('https://api.example.com/data')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'data': 'test'})

    def test_with_patch_context_manager(self):
        """Test using patch as a context manager."""
        with patch('os.path.exists') as mock_exists:
            mock_exists.return_value = True

            import os
            result = os.path.exists('/fake/path')

            self.assertTrue(result)
            mock_exists.assert_called_once_with('/fake/path')

    def test_side_effects(self):
        """Test mocking with side effects."""
        mock_func = Mock()

        # Return different values on consecutive calls
        mock_func.side_effect = [1, 2, 3]
        self.assertEqual(mock_func(), 1)
        self.assertEqual(mock_func(), 2)
        self.assertEqual(mock_func(), 3)

        # Raise an exception
        mock_func.side_effect = ValueError("Error!")
        with self.assertRaises(ValueError):
            mock_func()

        # Use a function as side effect
        mock_func.side_effect = lambda x: x * 2
        self.assertEqual(mock_func(5), 10)
```

---

## Test Organization

### Subtest for Parameterized Tests

```python
# test_subtests.py
# Using subtests for parameterized testing
import unittest

def is_palindrome(s):
    """Check if string is a palindrome."""
    s = s.lower().replace(' ', '')
    return s == s[::-1]

class TestPalindrome(unittest.TestCase):
    """Tests for palindrome function using subtests."""

    def test_palindromes(self):
        """Test multiple palindrome cases."""
        test_cases = [
            ('radar', True),
            ('level', True),
            ('A man a plan a canal Panama', True),
            ('hello', False),
            ('world', False),
            ('', True),
        ]

        for text, expected in test_cases:
            with self.subTest(text=text):
                result = is_palindrome(text)
                self.assertEqual(result, expected)
```

### Skip Tests Conditionally

```python
# test_skip.py
# Skipping tests conditionally
import unittest
import sys

class TestSkipping(unittest.TestCase):
    """Examples of skipping tests."""

    @unittest.skip("Demonstrating skip")
    def test_skipped(self):
        """This test is always skipped."""
        self.fail("Should not run")

    @unittest.skipIf(sys.version_info < (3, 10), "Requires Python 3.10+")
    def test_requires_python_310(self):
        """Test that requires Python 3.10 or higher."""
        pass

    @unittest.skipUnless(sys.platform.startswith('linux'), "Requires Linux")
    def test_linux_only(self):
        """Test that only runs on Linux."""
        pass

    def test_dynamic_skip(self):
        """Skip dynamically based on runtime condition."""
        config = get_config()
        if not config.get('feature_enabled'):
            self.skipTest("Feature not enabled")

        # Rest of test...

    @unittest.expectedFailure
    def test_expected_to_fail(self):
        """Test that is expected to fail."""
        self.assertEqual(1, 2)  # This fails but does not cause test failure
```

---

## Test Discovery

### Project Structure

```
project/
    src/
        calculator.py
        user_service.py
    tests/
        __init__.py
        test_calculator.py
        test_user_service.py
        integration/
            __init__.py
            test_api.py
```

### Test Runner Configuration

```python
# tests/__init__.py
# Test package initialization

# tests/test_calculator.py
import unittest
import sys
sys.path.insert(0, '../src')

from calculator import Calculator

class TestCalculator(unittest.TestCase):
    """Tests for Calculator class."""
    pass
```

### Running Test Discovery

```bash
# Discover all tests
python -m unittest discover

# Discover with specific pattern
python -m unittest discover -s tests -p "test_*.py"

# Discover in specific directory
python -m unittest discover -s tests/integration

# Verbose discovery
python -m unittest discover -v
```

---

## Test Configuration

```python
# test_config.py
# Configuring test runs
import unittest

def suite():
    """Create a test suite."""
    suite = unittest.TestSuite()

    # Add specific tests
    suite.addTest(TestMathOperations('test_add_positive_numbers'))
    suite.addTest(TestMathOperations('test_divide_numbers'))

    # Add all tests from a class
    suite.addTests(unittest.TestLoader().loadTestsFromTestCase(TestUserService))

    return suite

if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite())


# Using test loader
loader = unittest.TestLoader()

# Load tests by pattern
suite = loader.discover('tests', pattern='test_*.py')

# Load from specific module
suite = loader.loadTestsFromModule(test_module)

# Load from class
suite = loader.loadTestsFromTestCase(TestClass)
```

---

## Best Practices

```python
# best_practices.py
# Test writing best practices
import unittest

class TestBestPractices(unittest.TestCase):
    """Examples of test best practices."""

    def test_one_assertion_per_test(self):
        """Each test should verify one behavior."""
        # Good: Clear what is being tested
        result = calculate_tax(100, 0.1)
        self.assertEqual(result, 10)

    def test_descriptive_names(self):
        """Test names should describe the scenario and expected result."""
        # test_user_creation_with_invalid_email_raises_validation_error
        pass

    def test_arrange_act_assert(self):
        """Follow AAA pattern for test structure."""
        # Arrange - set up test data
        user_data = {'name': 'Alice', 'email': 'alice@example.com'}

        # Act - perform the action
        user = create_user(**user_data)

        # Assert - verify the result
        self.assertEqual(user.name, 'Alice')

    def test_independent_tests(self):
        """Tests should not depend on each other."""
        # Each test should set up its own data
        # Tests should be able to run in any order
        pass

    def test_fast_execution(self):
        """Tests should run quickly."""
        # Mock external dependencies
        # Avoid network calls and file I/O when possible
        pass
```

---

## Conclusion

Python's unittest module provides:

- A structured framework for writing test cases
- Rich assertion methods for verifying behavior
- Fixtures for setup and teardown
- Mocking capabilities for isolating code
- Test discovery and organization tools

Write tests consistently, keep them fast and independent, and use mocking to isolate the code under test.

---

*Building reliable Python applications? [OneUptime](https://oneuptime.com) helps you monitor your applications, track test coverage, and ensure code quality in production.*

