import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useSocket } from '../hooks/useSocket';

export default function ChatPage() {
  useSocket(); // Initialize socket connection

  return (
    <div className="flex h-screen w-full overflow-hidden bg-plane-bg">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
