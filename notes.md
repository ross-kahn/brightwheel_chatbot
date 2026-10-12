1. Handbook ingestion
   1. Summarize important handbook information, or index it, so that lookup is more efficient and takes fewer tokens. Maybe a type of RAG strategy?
2. Search
   1. First the model should try and categorize the search request. Is it about curriculum? Tuition? Scheduling? Tours? etc.
   2. This category should feed into the index / RAG strategy
   3. Questions should be limited to a certain number of characters (will this hurt usability? Mark this as a follow-on to MVP)
3. Observability
   1. Each request should be logged with the full search text, categorization, and response along with metadata like time and user contact info (optional?)
4. Prompting
   1. Obviously a prototype isn't going to use bedrock so we need some other kind of free API to query a lightweight model. Are there any models we could run locally? What's the cost associated with that in space and performance?
   2. Tone is important. Efficient, but gentle and friendly. Parents are already busy and tired, and dealing with something so important to their kids is emotionally sensitive
5. Scope
   1. Try for breadth here. A relatively thin MVP slice that can cover parent chat, operator dashboards, and knowledge editing
6. Knowledge editing
   1. Should this be covered entirely by the handbook upload process, or somehow synthesized into something that can be edited by an operator?
   2. Instead of RAG, what would it look like to deconstruct the handbook into some sort of standardized data format that we could query?
      1. I feel like the data is too unstructured to play nicely here. It might be possible but it'd need a LOT of time and thought, and even then it'd probably need to be a no-sql type of storage to handle the unstructured-ness of it. Think medical data.

Time logging:
Notes - 10 min
Planning - 20 min
Initial prototyping - 45 min

Ok let's work on the writeup. Among the other things to talk about, I want to focus on usability, observability, iterative improvement of the knowledge base, token usage considerations, storage considerations, privacy considerations, security (how easily could malicious users get sensitive information from the kowledge base or previously asked questions), architecture considerations for a production MVP, and maybe more.

Since there's still some time to spare, is there any kind of testing harness or accuracy eval we could add? Unless you look up the answer in the handbook yourself, it's difficult to know whether the answers are accurate. Although I guess that's what the knowledge linking badges are for
