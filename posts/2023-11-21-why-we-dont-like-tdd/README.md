# Why we dont like TDD: A Developer’s Perspective

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Tests

Description: Test-Driven Development (TDD) is a software practice emphasizing writing tests before code. Many find drawbacks in committing to an API prematurely and hindering exploration during early development. 

Test-Driven Development (TDD) is a software development process that relies on the repetition of a very short development cycle: first the developer writes a failing automated test case that defines a desired improvement or new function, then produces code to pass that test, and finally refactors the new code to acceptable standards.

However, very few developers follow this approach religiously (and we at [OneUptime](https://oneuptime.com) certainly don't). Here’s why:

### Commitment to an API

TDD requires you to commit to an API before you fully understand what you want from it. This can be a significant drawback, especially in the early stages of development when you’re still exploring different possibilities.

When you’re just starting out with a new feature or module, you’re often in an exploratory phase. You’re trying out different approaches, iterating on your ideas, and generally figuring out what works best. In this phase, committing to an API can feel premature.

### The Iterative Process

In the early stages of development, iteration is key. You’re not just writing code; you’re also learning about the problem space, the potential solutions, and the trade-offs between them. This learning process is crucial, and it’s something that TDD can sometimes hinder.

With TDD, you write a test, then write code to pass the test, and then refactor. This cycle can be very effective once you have a clear understanding of what you’re trying to achieve. But when you’re still in the exploratory phase, this cycle can feel constraining. You might find yourself spending more time rewriting tests than actually writing code.

### Adding Tests Later

Once you’re happy with your API, that’s when tests come into play. Writing tests after you’ve settled on an API allows you to focus on ensuring that your code works as expected, rather than spending time updating tests to reflect changes in your API.

Tests are incredibly valuable, and they’re a crucial part of the development process. But like any tool, they need to be used at the right time and in the right way. By waiting until you’re happy with your API before writing tests, you can make the most of your tests without letting them slow you down during the exploratory phase.

> TDD has its place in the software development lifecycle, it’s not always the best approach for every situation.

As with any methodology, it’s important to understand its strengths and weaknesses, and to use it where it makes the most sense. And remember, the ultimate goal is to produce high-quality, reliable software - whether you use TDD or not.

**Related Reading:**

- [The Power of Three: How Small Teams Drive Big Results at OneUptime](https://oneuptime.com/blog/post/2025-03-13-power-of-three-how-small-teams-drive-big-results/view)
- [Why engineers should spend 20% of their time talking to customers.](https://oneuptime.com/blog/post/2025-08-22-why-engineers-should-spend-20-percent-of-time-talking-to-customers/view)
- [Why We Resent Middle Managers (And Why OneUptime Doesn't Have Any)](https://oneuptime.com/blog/post/2025-08-29-why-we-resent-middle-managers-and-why-we-dont-have-them/view)
