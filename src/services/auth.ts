// Authentication Service - Simple local auth with persistence
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  state?: string;
  city?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

const AUTH_KEY = 'weatherApp_auth';

// Demo users (in production, this would be backend)
const DEMO_USERS = [
  { email: 'admin@weatherapp.com', password: 'admin123', name: 'Administrator' },
  { email: 'user@weatherapp.com', password: 'user123', name: 'Demo User' },
];

export const auth = {
  // Login
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Demo authentication
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (demoUser) {
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: demoUser.email,
        name: demoUser.name,
        createdAt: new Date().toISOString(),
      };

      const authState: AuthState = {
        isAuthenticated: true,
        user,
        token: Math.random().toString(36).substr(2, 16),
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
      return { success: true, user };
    }

    return { success: false, error: 'Invalid email or password' };
  },

  // Register
  register: async (email: string, password: string, name: string, phone?: string, state?: string, city?: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check if email already exists
    if (DEMO_USERS.find(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      phone,
      state,
      city,
      createdAt: new Date().toISOString(),
    };

    const authState: AuthState = {
      isAuthenticated: true,
      user,
      token: Math.random().toString(36).substr(2, 16),
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
    return { success: true, user };
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem(AUTH_KEY);
  },

  // Check if user is logged in
  checkAuth: (): AuthState => {
    try {
      const data = localStorage.getItem(AUTH_KEY);
      if (data) {
        const authState: AuthState = JSON.parse(data);
        return authState;
      }
    } catch {
      // Invalid auth data
    }
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const authState = auth.checkAuth();
    return authState.user;
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const authState = auth.checkAuth();
    if (!authState.isAuthenticated || !authState.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const updatedUser = { ...authState.user, ...updates };
    const newAuthState = {
      ...authState,
      user: updatedUser,
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
    return { success: true, user: updatedUser };
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const authState = auth.checkAuth();
    if (!authState.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // In a real app, verify old password against stored hash
    return { success: true };
  },
};
