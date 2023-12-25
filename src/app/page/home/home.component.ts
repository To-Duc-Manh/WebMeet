import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';


declare var Peer: any;
declare var io: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  private socket: any;
  private peer: any;
  private isCameraOn: boolean = true; // Track camera state
  private isConnected: boolean = false; // Track connection state


  constructor() {
    // Khởi tạo socket.io và Peer khi component được tạo
    this.socket = io("http://localhost:3000");
    this.peer = new Peer();
  }

  ngOnInit() {
    // Thiết lập lắng nghe sự kiện từ server socket.io
    this.setupSocketListeners();
    // Thiết lập lắng nghe sự kiện từ Peer.js
    this.setupPeerListeners();
    // Thiết lập lắng nghe sự kiện từ DOM (button clicks)
    this.setupEventListeners();

    // this.hideChatDiv();
  }
  private setupEventListeners() {
    const btnClose = document.getElementById('btnClose');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        // Đóng kết nối và tắt camera
        this.closeConnectionAndCamera();
      });
    } else {
      console.error("Không tìm thấy button có ID là 'btnClose'");
    }
  }
  private closeConnectionAndCamera() {
    if (this.isConnected) {
      // Đóng kết nối
      this.disconnect();
    }
    if (this.isCameraOn) {
      // Tắt camera
      this.stopCamera();
    }
  }
  private disconnect() {
    this.peer.disconnect();
    this.isConnected = false;
  }

  // Mở luồng media để lấy stream
  private openStream() {
    const config = { audio: false, video: true };
    return navigator.mediaDevices.getUserMedia(config)
      .then((stream) => {
        this.isCameraOn = true;
        return stream;
      })
      .catch((error) => {
        console.error('Error accessing camera:', error);
        this.isCameraOn = false;
        throw error;
      });
  }

  private stopCamera() {
    if (this.isCameraOn) {
      const video = document.getElementById('localStream') as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          track.stop(); // Dừng mọi track trong stream
        });

        video.srcObject = null; // Gỡ bỏ stream khỏi video element
        this.isCameraOn = false; // Cập nhật trạng thái camera
      }
    }
  }

  // Hiển thị stream lên video tag
  private playStream(idVideoTag: string, stream: MediaStream) {
    const video = document.getElementById(idVideoTag) as HTMLVideoElement;
    if (video) {
      video.srcObject = stream;
      video.play();
    }
  }


  // Trả lời cuộc gọi đến
  private answerCall(call: any) {
    this.openStream().then(stream => {
      call.answer(stream);
      this.playStream('localStream', stream);
      call.on('stream', (userVideoStream: any) => this.playStream('remoteStream', userVideoStream));
    });
  }

  // Gọi người dùng khi click vào tên trong danh sách
  private callUser(peerId: any) {
    this.openStream().then(stream => {
      this.playStream('localStream', stream);
      const call = this.peer.call(peerId, stream);
      call.on('stream', (userVideoStream: any) => this.playStream('remoteStream', userVideoStream));
    });
  }

  // Thiết lập lắng nghe sự kiện từ Peer.js
  private setupPeerListeners() {
    this.peer.on('open', (id: any) => {
      // Hiển thị ID của người dùng hiện tại và thiết lập sự kiện đăng ký
      this.displayMyId(id);
      this.setupSignUpButton(id);
    });

    // Lắng nghe sự kiện cuộc gọi đến từ người dùng khác
    this.peer.on('call', (call: any) => {
      if (confirm("Bạn có muốn chấp nhận cuộc gọi từ người dùng này không?")) {
        // Nếu người dùng chấp nhận, thực hiện cuộc gọi
        this.answerCall(call);
      } else {

      }
    });
  }

  // Thiết lập lắng nghe sự kiện từ server socket.io
  private setupSocketListeners() {
    this.socket.on('DANH_SACH_ONLINE', (users: any[]) => {
      // Hiển thị phần chat, ẩn phần đăng ký và hiển thị danh sách người dùng online
      this.showChatDiv();
      this.hideSignUpDiv();
      this.displayOnlineUsers(users);

      // Lắng nghe sự kiện khi có người dùng mới đăng ký
      this.socket.on('NGUOI_DUNG_MOI', (user: { username: any; peerId: any; }) => {
        this.displayOnlineUser(user);
      });

      // Lắng nghe sự kiện khi người dùng rời khỏi
      this.socket.on('NGUOI_DUNG_ROI_RA', (peerId: any) => {
        this.removeUserElement(peerId);
      });


    });

    // Lắng nghe sự kiện khi người dùng đã tồn tại
    this.socket.on('NGUOI_DUNG_TON_TAI', () => {
      alert('Nguoi dung ton tai');
    });
  }


  // Hiển thị danh sách người dùng online
  private displayOnlineUsers(users: any[]) {
    const ulUser = document.getElementById('ulUser');
    if (ulUser) {
      users.forEach((user: { username: any; peerId: any; }) => {
        const { username, peerId } = user;
        ulUser.appendChild(this.createUserElement(peerId, username));
      });
    }
  }

  // Tạo phần tử người dùng và thêm sự kiện click để gọi
  private createUserElement(peerId: any, username: any) {
    const li = document.createElement('li');
    li.id = peerId;
    li.textContent = username;
    li.addEventListener('click', () => this.callUser(peerId));
    return li;
  }

  // Hiển thị người dùng online mới đăng ký
  private displayOnlineUser(user: { username: any; peerId: any; }) {
    const ulUser = document.getElementById('ulUser');
    if (ulUser) {
      ulUser.appendChild(this.createUserElement(user.peerId, user.username));
    }
  }

  // Xóa phần tử người dùng khi rời khỏi
  private removeUserElement(peerId: any) {
    const userElement = document.getElementById(peerId);
    if (userElement) {
      userElement.remove();
    }
  }

  // Hiển thị ID của người dùng hiện tại
  private displayMyId(id: any) {
    const myIdElement = document.getElementById('myId');
    if (myIdElement) {
      myIdElement.textContent = id;
    }
  }

  // Thiết lập sự kiện đăng ký khi nhấn nút
  private setupSignUpButton(id: any) {
    const signUpButton = document.getElementById('btnSignUp');
    if (signUpButton) {
      signUpButton.addEventListener('click', () => this.signUp(id));
    }
  }

  // Đăng ký người dùng với username và ID
  private signUp(id: any) {
    const usernameInput = document.getElementById('txtUsername') as HTMLInputElement;
    const username = usernameInput.value;
    this.socket.emit('NGUOI_DUNG_DANG_KI', { username, peerId: id });
  }

  // Hiển thị phần chat
  private showChatDiv() {
    const chatDiv = document.getElementById('div_chat');
    if (chatDiv) {
      chatDiv.style.display = 'block';
    }
  }

  private hideChatDiv() {
    const chatDiv = document.getElementById('div_chat');
    if (chatDiv) {
      chatDiv.style.display = 'none';
    }
  }

  // Ẩn phầnđăng ký
  private hideSignUpDiv() {
    const signUpDiv = document.getElementById('div_dki');
    if (signUpDiv) {
      signUpDiv.style.display = 'none';
    }
  }
}






// // Thiết lập sự kiện cho nút gọi
// private setupEventListeners() {
//   const callButton = document.getElementById('btnCall');
//   if (callButton) {
//     callButton.addEventListener('click', () => this.callUserById());
//   }
// }

// // Gọi người dùng dựa trên ID nhập vào
// private callUserById() {
//   const remoteIdInput = document.getElementById('remoteId') as HTMLInputElement;
//   const id = remoteIdInput.value;
//   this.openStream().then(stream => {
//     this.playStream('localStream', stream);
//     const call = this.peer.call(id, stream);
//     call.on('stream', (userVideoStream: any) => this.playStream('remoteStream', userVideoStream));
//   });
// }