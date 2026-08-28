jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((colName) => ({
      doc: jest.fn((docId) => ({
        get: jest.fn(() => {
          if (colName === 'businesses') {
            return Promise.resolve({ exists: true, data: () => ({ planId: 'enterprise', subscriptionStatus: 'active' }) });
          }
          if (colName === 'users') {
            return Promise.resolve({ 
              exists: true, 
              data: () => ({ 
                role: docId.includes('staff') ? 'client_staff' : 'agency_owner',
                businessIds: [docId === 'user_A' ? 'biz_A' : docId === 'user_B' ? 'biz_B' : 'test_biz_123'],
                agencyId: 'agency_123'
              }) 
            });
          }
          if (colName === 'websites') {
            return Promise.resolve({ 
              exists: true, 
              data: () => ({ 
                id: docId, 
                businessId: docId === 'site_A' ? 'biz_A' : 'test_biz_123',
                config: { businessName: 'Mock Site', customDomain: 'enterprise.com' },
                pages: []
              }) 
            });
          }
          return Promise.resolve({ exists: false });
        }),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn((data) => Promise.resolve({ id: 'mock_id_' + Date.now(), ...data })),
      where: function(field, op, value) {
        const query = {
          where: jest.fn().mockImplementation(function() { return query; }),
          orderBy: jest.fn().mockImplementation(function() { return query; }),
          limit: jest.fn().mockImplementation(function() { return query; }),
          get: jest.fn(() => Promise.resolve({ 
            size: 1, 
            docs: [{ 
              id: 'site_123', 
              data: () => ({ 
                id: 'site_123',
                businessId: value, 
                fileName: 'test-image.png',
                archivedAt: { seconds: Date.now() / 1000 }
              }) 
            }] 
          }))
        };
        return query;
      }
    })),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(),
  },
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn((token) => Promise.resolve({ uid: token === 'staff_token' ? 'staff_user_456' : 'user_ent_123' })),
  })),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() => Promise.resolve({
        response: { text: () => JSON.stringify({ config: {}, blocks: [] }) }
      }))
    }))
  })),
}));

jest.mock('dns', () => ({
  promises: {
    resolveCname: jest.fn((domain) => {
      if (domain === 'valid.com') return Promise.resolve(['edge.septicflow.com']);
      return Promise.reject(new Error('ENOTFOUND'));
    })
  }
}));
