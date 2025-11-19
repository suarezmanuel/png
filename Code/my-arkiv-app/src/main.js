import {createWalletClient, createPublicClient, http} from '@arkiv-network/sdk'
import {mendoza} from '@arkiv-network/sdk/chains'
import { ExpirationTime, stringToPayload, bytesToString} from '@arkiv-network/sdk/utils'
import { privateKeyToAccount} from '@arkiv-network/sdk/accounts';
import { custom } from '@arkiv-network/sdk';

// 2. Define a function to handle the connection (async wrapper)
async function connectAndWrite() {
  
  // Check if MetaMask is installed
  if (!window.ethereum) {
    alert('Please install MetaMask!');
    return;
  }

  // 3. Request access to the user's MetaMask accounts
  // This pops up the MetaMask window asking for permission
  const [account] = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });

  // 4. Connect to Arkiv using the Browser Wallet (MetaMask)
  const walletClient = createWalletClient({
    chain: mendoza,
    // 'custom' tells it to use the browser extension instead of a private key
    transport: custom(window.ethereum),
    account: account, 
  });

  // Public client can still use HTTP for faster reads, or custom(window.ethereum) too
  const publicClient = createPublicClient({
    chain: mendoza,
    transport: http('https://mendoza.hoodi.arkiv.network/rpc'),
  });

  console.log(`Connected as: ${account}`);

  // 5. Write the record (Triggers a MetaMask popup to sign/confirm)
  const { entityKey, txHash } = await walletClient.createEntity({
    payload: stringToPayload('Hello from MetaMask!'),
    contentType: 'text/plain',
    attributes: [{ key: 'type', value: 'browser-wallet' }],
    expiresIn: 120,
  });

  // 6. Read it back
  const entity = await publicClient.getEntity(entityKey);
  const data = bytesToString(entity.payload);

  console.log('Key:', entityKey);
  console.log('Data:', data);
  console.log('Tx:', txHash);
}

console.log(Object.keys(publicClient)); 

// Run the function
connectAndWrite();