import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { PrivyProvider, usePrivy } from 'https://esm.sh/@privy-io/react-auth?deps=react@18.2.0,react-dom@18.2.0';

// A hidden component just to access the usePrivy hook
const PrivyController = () => {
  const { login, logout, authenticated, getAccessToken, user } = usePrivy();

  // Expose privy functions to the global window object for vanilla JS
  window.privyLogin = login;
  window.privyLogout = logout;
  window.privyGetAccessToken = getAccessToken;
  
  // React to auth state changes
  React.useEffect(() => {
    if (authenticated && user) {
      console.log("Privy user authenticated!", user);
      if (window.updateAuthUI) window.updateAuthUI(user);
    } else {
      if (window.updateAuthUI) window.updateAuthUI(null);
    }
  }, [authenticated, user]);

  return null; // Don't render anything visible
};

const PrivyApp = () => {
  return React.createElement(PrivyProvider, {
    appId: 'cm4winhli04jg1tvq07cb8942', // From .env.local
    config: {
      loginMethods: ['email', 'wallet'],
      appearance: { 
        theme: 'dark',
        accentColor: '#5c24ff',
        logo: 'https://bota.gg/logo.png' 
      }
    }
  }, React.createElement(PrivyController));
};

export function initReactPrivy() {
  const rootElement = document.createElement('div');
  rootElement.id = 'privy-react-root';
  document.body.appendChild(rootElement);

  const root = createRoot(rootElement);
  root.render(React.createElement(PrivyApp));
}
