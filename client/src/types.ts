export type CommentDto = {
  id: string;
  content: string;
  mediaUrl: string | null;
  createdAt: string;
  user: { id: string; username: string; name: string | null; avatarUrl: string | null };
};

export type PostDto = {
  id: string;
  content: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { id: string; username: string; name: string | null; avatarUrl: string | null };
  hashtags: string[];
  liked: boolean;
  likeCount: number;
  commentCount: number;
  isOwn: boolean;
};
