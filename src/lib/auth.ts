import { NextAuthOptions, Profile, Account, User, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import GithubProvider from 'next-auth/providers/github';
import { prisma } from '@/lib/prisma';

// Extend NextAuth module types so TypeScript recognizes custom fields
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubId?: string;
      username?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    githubId?: string;
    username?: string;
  }
}

// GitHub Profile Type
interface GitHubProfile extends Profile {
  id: number;
  login: string;
  avatar_url?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'read:user user:email repo write:repo_hook',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
    }) {
      if (!account || !profile) return false;
      const ghProfile = profile as GitHubProfile;

      await prisma.user.upsert({
        where: { githubId: ghProfile.id.toString() },
        update: {
          name: user.name || ghProfile.login,
          email: user.email,
          avatar: user.image,
        },
        create: {
          githubId: ghProfile.id.toString(),
          name: user.name || ghProfile.login,
          email: user.email,
          avatar: user.image,
        },
      });

      return true;
    },
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account: Account | null;
      profile?: Profile;
    }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        const ghProfile = profile as GitHubProfile;
        token.githubId = ghProfile.id.toString();
        token.username = ghProfile.login;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (session.user) {
        session.accessToken = token.accessToken;
        session.user.githubId = token.githubId;
        session.user.username = token.username;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};