import { Router } from "express";

const router = Router();

const faqs = [
  // Getting Started
  {
    id: "gs-1",
    category: "Getting Started",
    question: "How do I create an account?",
    answer:
      "Open Sign Up, choose a username, email, and password (at least 6 characters), then sign in from the login page.",
  },
  {
    id: "gs-2",
    category: "Getting Started",
    question: "How do I find my way around Shoqnohu?",
    answer:
      "Use the left sidebar: Feed for posts, Events and Groups for community features, Messages for chats, Profile for your page, and Support for help.",
  },
  {
    id: "gs-3",
    category: "Getting Started",
    question: "How do I search for people or posts?",
    answer:
      "Use the search bar at the top of the app. Type at least two characters to see people and posts; you can open a profile or jump to a post from the results.",
  },
  {
    id: "gs-4",
    category: "Getting Started",
    question: "What browsers work best with Shoqnohu?",
    answer:
      "Use a current version of Chrome, Edge, Firefox, or Safari. Keep JavaScript enabled and allow the site to reach the API (same network or correct API URL in settings).",
  },
  {
    id: "gs-5",
    category: "Getting Started",
    question: "Where do I change my language or theme?",
    answer:
      "Language and theme toggles are not in this build; the app uses the browser language and the default light theme. Check back for updates.",
  },
  // Account
  {
    id: "ac-1",
    category: "Account",
    question: "How do I reset my password?",
    answer:
      "Email bonevet_ai@bonevet.org from the address you used to register and include your username. We will help you regain access.",
  },
  {
    id: "ac-2",
    category: "Account",
    question: "How do I update my profile?",
    answer:
      "Go to Profile, tap Edit Profile, then save your name, bio, location, and interests. You can also upload a new avatar or cover image from the same page.",
  },
  {
    id: "ac-3",
    category: "Account",
    question: "How do I sign out?",
    answer: "Click Sign Out at the bottom of the sidebar. You will need to sign in again to use the app.",
  },
  {
    id: "ac-4",
    category: "Account",
    question: "Can I change my username after signing up?",
    answer:
      "Username changes are not available in the app today. Email bonevet_ai@bonevet.org if you need a correction for a typo or a safety concern.",
  },
  {
    id: "ac-5",
    category: "Account",
    question: "Why was I logged out suddenly?",
    answer:
      "Your session token may have expired, the server was restarted, or JWT settings changed. Sign in again; if it keeps happening, email support with the approximate time it happened.",
  },
  // Posts
  {
    id: "po-1",
    category: "Posts",
    question: "How do I create a post?",
    answer:
      "On the Feed, write in the composer, add optional hashtags (comma-separated), attach an image if you like, then publish.",
  },
  {
    id: "po-2",
    category: "Posts",
    question: "How do hashtags work?",
    answer:
      "Add words after # in your post or use the hashtags field; they appear as chips and help others discover your content.",
  },
  {
    id: "po-3",
    category: "Posts",
    question: "Can I add images to comments?",
    answer:
      "Yes. Open the comments on a post, use Add image to upload, wait until each image is uploaded, then post your comment with text and/or images.",
  },
  {
    id: "po-4",
    category: "Posts",
    question: "How do I like a post?",
    answer:
      "Click the heart icon on a post. Tap again to remove your like. Like counts update for everyone.",
  },
  {
    id: "po-5",
    category: "Posts",
    question: "Can I edit or delete a post after publishing?",
    answer:
      "Post edit and delete are not shown in the current UI. Contact bonevet_ai@bonevet.org if you need something removed urgently.",
  },
  // Events
  {
    id: "ev-1",
    category: "Events",
    question: "How do I create an event?",
    answer:
      "Open Events, click Create Event, and fill in title, description, location, date and time, category, and at least two venue photos so others can see the place.",
  },
  {
    id: "ev-2",
    category: "Events",
    question: "How do I RSVP?",
    answer:
      "On an event card, use Going or Interested to update your RSVP. Counts update for everyone after you choose.",
  },
  {
    id: "ev-3",
    category: "Events",
    question: "Why do I need two photos to create an event?",
    answer:
      "Venue photos help attendees recognize the location and decide if they want to join. Upload at least two images of the place before you can publish.",
  },
  {
    id: "ev-4",
    category: "Events",
    question: "Can I change my RSVP later?",
    answer:
      "Yes. Tap Going or Interested again to switch between them. Your latest choice is what others see in the counts.",
  },
  {
    id: "ev-5",
    category: "Events",
    question: "Who can see events I create?",
    answer:
      "Events appear on the Events page for signed-in users. Share the app link with your community so people can browse and RSVP.",
  },
  // Groups
  {
    id: "gr-1",
    category: "Groups",
    question: "How do I join a group?",
    answer:
      "Browse the Groups page and tap Join Group on a public group. Private groups may require approval in a future update.",
  },
  {
    id: "gr-2",
    category: "Groups",
    question: "Where is group chat?",
    answer:
      "After you join, open the Joined menu on the group card and choose Group chat to open the conversation in Messages.",
  },
  {
    id: "gr-3",
    category: "Groups",
    question: "How do I see who is in a group?",
    answer:
      "Use Joined on the group card, then scroll the Members list in the menu to see names and usernames.",
  },
  {
    id: "gr-4",
    category: "Groups",
    question: "How do I create a new group?",
    answer:
      "On the Groups page, click Create Group, enter name, description, category, and privacy, then submit. You join as the first member automatically.",
  },
  {
    id: "gr-5",
    category: "Groups",
    question: "What is the difference between public and private groups?",
    answer:
      "Public groups let anyone join with one click. Private groups are not joinable without approval in this version; that flow may be added later.",
  },
  // Safety
  {
    id: "sa-1",
    category: "Safety",
    question: "How do I report inappropriate content?",
    answer:
      "Use Contact Support below to email our team with a link to the post or comment and a short description. We review reports as soon as we can.",
  },
  {
    id: "sa-2",
    category: "Safety",
    question: "What should I avoid sharing?",
    answer:
      "Do not share passwords, government IDs, or private data of others. Keep conversations respectful and follow your school or workplace rules when applicable.",
  },
  {
    id: "sa-3",
    category: "Safety",
    question: "What if someone harasses me in messages?",
    answer:
      "Stop engaging, take screenshots if needed, and email bonevet_ai@bonevet.org with the details so we can help.",
  },
  {
    id: "sa-4",
    category: "Safety",
    question: "What happens after I report something?",
    answer:
      "Our team reviews emails to bonevet_ai@bonevet.org and may remove content or restrict accounts depending on the situation and our policies.",
  },
  {
    id: "sa-5",
    category: "Safety",
    question: "Are minors allowed on Shoqnohu?",
    answer:
      "Follow your local laws and your institution’s rules. Parents and educators should supervise younger users and use privacy settings carefully.",
  },
  // Privacy
  {
    id: "pr-1",
    category: "Privacy",
    question: "How do I change my privacy settings?",
    answer:
      "Profile and post privacy fields exist in the data model; use Profile edit and future settings screens when available. For questions, contact support.",
  },
  {
    id: "pr-2",
    category: "Privacy",
    question: "Who can see my posts?",
    answer:
      "By default, posts are visible in the feed to signed-in users. Your profile page shows your public posts to visitors who open your profile.",
  },
  {
    id: "pr-3",
    category: "Privacy",
    question: "Is my email visible to others?",
    answer:
      "Your email is used for login and is not shown on your public profile to other users.",
  },
  {
    id: "pr-4",
    category: "Privacy",
    question: "Does Shoqnohu sell my data?",
    answer:
      "This project is focused on learning and community; we do not describe data sales here. For specific commitments, email bonevet_ai@bonevet.org.",
  },
  {
    id: "pr-5",
    category: "Privacy",
    question: "Can I download or delete all my data?",
    answer:
      "Bulk export is not built into the app yet. Request deletion or a data summary by emailing support from your registered address.",
  },
  // Messaging
  {
    id: "me-1",
    category: "Messaging",
    question: "How do I send a private message?",
    answer:
      "Follow someone from their profile (Add friend), then open Messages, search for them in the friend picker, and start a conversation.",
  },
  {
    id: "me-2",
    category: "Messaging",
    question: "Why can’t I message someone?",
    answer:
      "You can only start chats with people you follow. Visit their profile and follow them first, then return to Messages.",
  },
  {
    id: "me-3",
    category: "Messaging",
    question: "What are group chats in Messages?",
    answer:
      "When you join a group, that group’s chat appears in your conversation list with a group icon and the group name.",
  },
  {
    id: "me-4",
    category: "Messaging",
    question: "How do I know I have a new message?",
    answer:
      "Open Messages and check your conversation list; notifications in the header may also alert you when new activity arrives.",
  },
  {
    id: "me-5",
    category: "Messaging",
    question: "Can I block someone?",
    answer:
      "A dedicated block button is not in this release. Unfollow the person, avoid messaging, and email bonevet_ai@bonevet.org if you need help with harassment.",
  },
];

router.get("/faqs", (_req, res) => {
  res.json(faqs);
});

export default router;
