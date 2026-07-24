import { NextAuthOptions, Profile, Account, User, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import GithubProvider from 'next-auth/providers/github';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user?: {
      id?: string;
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

interface GitHubProfile extends Profile {
  id: number;
  login: string;
  avatar_url?: string;
  email?: string;
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

      const githubId = ghProfile.id.toString();
      const name = user.name || ghProfile.login || 'GitHub Developer';
      const email = user.email || ghProfile.email || null;
      const avatar = user.image || ghProfile.avatar_url || null;

      try {
        await prisma.user.upsert({
          where: { githubId },
          update: {
            name,
            email,
            avatar,
          },
          create: {
            githubId,
            name,
            email,
            avatar,
          },
        });
        return true;
      } catch (error) {
        console.error('Prisma User Upsert Error:', error);
        return false;
      }
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
    error: '/', // Redirect back to home on OAuth failure instead of crashing page
  },
  secret: process.env.NEXTAUTH_SECRET,
};