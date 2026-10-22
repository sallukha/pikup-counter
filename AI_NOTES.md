# AI Development Notes

## 1. AI Tools Used

I used ChatGPT and Codex to assist with the development of the Pickup Counter assignment.

- **ChatGPT:** Used to understand the requirements, learn PostgreSQL concepts by comparing them with MongoDB, troubleshoot database and Docker issues, and understand SQL queries.
- **Codex:** Used for AI-assisted coding, backend implementation, understanding project structure, and working through database-related tasks.
- **VS Code:** Used as the development environment to manage the project files and run commands.
- **pgAdmin:** Used to inspect the PostgreSQL database, verify tables, and check seeded product data.
- **Docker Compose:** Added to the project to configure and run the application services in containers.

## 2. A Prompt That Worked Well

"Review the Pickup Counter backend implementation against the assignment requirements. Check stock reservation under concurrent requests, the 120-second expiry, payment webhook HMAC signature verification using the raw request body, duplicate event handling, amount mismatch handling, and simultaneous pickup claims. Identify missing edge cases and suggest automated tests against a real PostgreSQL database."

This prompt helped focus the implementation on correctness, transaction safety, and the important requirements in the assignment.

## 3. An AI Mistake and How I Identified It

During Docker setup, the application could not start because the PostgreSQL container could not bind to host port 5432. An initial assumption that the Compose configuration would start without conflicts was incorrect for my local environment.

I checked the Windows port usage with `netstat` and identified a process already listening on port 5432. This showed me that AI-generated configuration must be tested in the actual development environment rather than assumed to work.

## 4. Verification Status

I connected to PostgreSQL and verified the database tables and seeded product data using pgAdmin and SQL queries.

Docker startup and the concurrency, webhook idempotency, and pickup-claim integration tests must be considered complete only after they have been run successfully.

I used AI as a development assistant, but I understand that the implementation and its behavior need to be verified before submission.