import React, { useState, useEffect, useCallback } from 'react';
import { login, signup, loginWithGoogle, loginWithFacebook } from '../services/db';
import { User } from '../types';
import './AuthScreen.css';

// Extend window for Google and Facebook SDKs
declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface AuthScreenProps {
  onAuth: (user: User) => void;
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || '';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);

  // Handle Google credential response
  const handleGoogleResponse = useCallback(async (response: any) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(response.credential, marketingConsent);
      onAuth(result.user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [onAuth, marketingConsent]);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      setGoogleReady(true);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [handleGoogleResponse]);

  // Load Facebook SDK
  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });
      setFacebookReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const handleGoogleClick = () => {
    if (googleReady && window.google) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google sign-in is loading, please try again in a moment.');
    }
  };

  const handleFacebookClick = () => {
    if (!facebookReady || !window.FB) {
      setError('Facebook sign-in is loading, please try again in a moment.');
      return;
    }

    window.FB.login(async (response: any) => {
      if (response.authResponse) {
        setError('');
        setLoading(true);
        try {
          const result = await loginWithFacebook(response.authResponse.accessToken, marketingConsent);
          onAuth(result.user);
        } catch (err: any) {
          setError(err.message || 'Facebook sign-in failed');
        } finally {
          setLoading(false);
        }
      }
    }, { scope: 'email,public_profile' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, name, marketingConsent);
      }
      onAuth(result.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Personal Systems</h1>
          <p>Your daily review &amp; planning system</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Social Login Buttons — always visible */}
        <div className="auth-social">
          {GOOGLE_CLIENT_ID && (
            <button
              type="button"
              className="auth-social-btn auth-google-btn"
              onClick={handleGoogleClick}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Log in with Google
            </button>
          )}

          {FACEBOOK_APP_ID && (
            <button
              type="button"
              className="auth-social-btn auth-facebook-btn"
              onClick={handleFacebookClick}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Log in with Facebook
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Email login — collapsed by default, expand on click */}
        {!showEmailForm ? (
          <button
            type="button"
            className="auth-email-toggle"
            onClick={() => setShowEmailForm(true)}
          >
            ✉️ {isLogin ? 'Log in with email' : 'Sign up with email'}
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="auth-field">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!isLogin && (
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                />
                <span>Send me updates about new features and offers</span>
              </label>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setShowEmailForm(false); }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};
