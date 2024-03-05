# OneUptime Blog

These blog posts are written by the OneUptime team and open source contributors. We write about our experiences, our learnings, and our thoughts on the world of software development, Kubernetes, Ceph, SRE, DevOps, Cloud and more. We hope you find our posts helpful and insightful.

Blogs are hosted at [OneUptime Blog](https://oneuptime.com/blog)

### Writing a blog post

If you are interested in writing a blog post, please follow these instructions:

**Step 1**: Fork this repository

**Step 2**: Create a new file in the `posts` directory with the following format:

```
posts/YYYY-MM-DD-title-of-the-post/README.md
```

Please make sure to replace `YYYY-MM-DD` with the date of the post and `title-of-the-post` with the title of the post. `title-of-the-post` should be in kebab case.

**Step 3**: Add the following front matter to the top of the file:

```markdown
# Title of the post

Author: [githubusername](https://www.github.com/githubusername)

Tags: Tag1, Tag2, Tag3

Description: One liner description of the post

Rest of your post in markdown format goes here. 
```

**Step 4**: Please add tags to Tags.md

Please make sure to add the tags to the `Tags.md` file in the root of the repository. This will help us categorize the posts.

**Step 5**: Please add your post to Blogs.json. This file is in the root of the repo. Here is an example.  

```json
{
    "title": "Why we dont like TDD: A Developer’s Perspective",
    "description": "Test-Driven Development (TDD) is a software practice emphasizing writing tests before code. Many find drawbacks in committing to an API prematurely and hindering exploration during early development. ",
    "authorGitHubUsername": "devneelpatel",
    "tags": ["Tests"],
    "post": "2023-11-21-why-we-dont-like-tdd"
}
```

**Step 6**: Create and add a social media image and place it under the `posts/YYYY-MM-DD-title-of-the-post` directory. The image should be named `social-media.png` and should be 1280x720 pixels. This image will be used when sharing the post on social media like Twitter, LinkedIn, etc.

**Step 7**: Create a new branch and submit a pull request

**Step 8**: Once the pull request is approved, it will be merged and your blog post will be live on the OneUptime blog.

### Content Policy

- We reserve the right to reject any content that we feel is not appropriate for our blog. We also reserve the right to remove any content that we feel is not appropriate for our blog.
- All content must be original and not published anywhere else.
- We reserve the right to edit the content for grammar, spelling, and formatting.
- We reserve the right to add a disclaimer to the content if we feel it is necessary.
- Marketing content will not be accepted.
- All of the content will be licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

We look forward to reading your what you write! If you need help, please dont hesitate to create a GitHub issue in this repository. 

