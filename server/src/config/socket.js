import { Server } from 'socket.io';
import { config } from './env.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Allow clients to join specific order rooms if needed later
    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
    });
    
    // Join a general kitchen room
    socket.on('join_kitchen', () => {
      socket.join('kitchen_display');
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    console.warn('Socket.io not initialized, returning dummy object');
    return { emit: () => {}, to: () => ({ emit: () => {} }) };
  }
  return io;
};
