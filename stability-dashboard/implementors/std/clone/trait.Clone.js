(function() {var implementors = {};
implementors['std'] = ["<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/ascii/struct.Ascii.html' title='std::ascii::Ascii'>Ascii</a>","<a class='stability Unstable' title='Unstable'></a>impl&lt;T&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/gc/struct.Gc.html' title='std::gc::Gc'>Gc</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>, H: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/hashmap/struct.HashMap.html' title='std::collections::hashmap::HashMap'>HashMap</a>&lt;K, V, H&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>, H: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/hashmap/struct.HashSet.html' title='std::collections::hashmap::HashSet'>HashSet</a>&lt;T, H&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/bitv/struct.SmallBitv.html' title='collections::bitv::SmallBitv'>SmallBitv</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/bitv/struct.BigBitv.html' title='collections::bitv::BigBitv'>BigBitv</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='collections/bitv/type.BitvVariant.html' title='collections::bitv::BitvVariant'>BitvVariant</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/bitv/struct.Bitv.html' title='std::collections::bitv::Bitv'>Bitv</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/bitv/struct.BitvSet.html' title='std::collections::bitv::BitvSet'>BitvSet</a>","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/btree/struct.BTree.html' title='std::collections::btree::BTree'>BTree</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='collections/btree/type.Node.html' title='collections::btree::Node'>Node</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/btree/struct.Leaf.html' title='collections::btree::Leaf'>Leaf</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/btree/struct.Branch.html' title='collections::btree::Branch'>Branch</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/btree/struct.LeafElt.html' title='collections::btree::LeafElt'>LeafElt</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> + <a class='trait' href='std/cmp/trait.Ord.html' title='std::cmp::Ord'>Ord</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/btree/struct.BranchElt.html' title='collections::btree::BranchElt'>BranchElt</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;'a, T&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/dlist/struct.Items.html' title='std::collections::dlist::Items'>Items</a>&lt;'a, T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/dlist/struct.MoveItems.html' title='std::collections::dlist::MoveItems'>MoveItems</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/dlist/struct.Rawlink.html' title='collections::dlist::Rawlink'>Rawlink</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;A: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/dlist/struct.DList.html' title='std::collections::dlist::DList'>DList</a>&lt;A&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;E: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/enum_set/struct.EnumSet.html' title='std::collections::enum_set::EnumSet'>EnumSet</a>&lt;E&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/priority_queue/struct.PriorityQueue.html' title='std::collections::priority_queue::PriorityQueue'>PriorityQueue</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/ringbuf/struct.RingBuf.html' title='std::collections::ringbuf::RingBuf'>RingBuf</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/treemap/struct.TreeMap.html' title='std::collections::treemap::TreeMap'>TreeMap</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/collections/treemap/struct.TreeSet.html' title='std::collections::treemap::TreeSet'>TreeSet</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;K: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>, V: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='collections/treemap/struct.TreeNode.html' title='collections::treemap::TreeNode'>TreeNode</a>&lt;K, V&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='collections/str/type.DecompositionType.html' title='collections::str::DecompositionType'>DecompositionType</a>","<a class='stability Experimental' title='Experimental'></a>impl&lt;'a&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/str/struct.Decompositions.html' title='std::str::Decompositions'>Decompositions</a>&lt;'a&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;'a&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/str/type.MaybeOwned.html' title='std::str::MaybeOwned'>MaybeOwned</a>&lt;'a&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/string/struct.String.html' title='std::string::String'>String</a>","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/vec/struct.Vec.html' title='std::vec::Vec'>Vec</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/hash/sip/struct.SipState.html' title='std::hash::sip::SipState'>SipState</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/hash/sip/struct.SipHasher.html' title='std::hash::sip::SipHasher'>SipHasher</a>","<a class='stability Unstable' title='Unstable'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/hash/struct.RandomSipHasher.html' title='std::hash::RandomSipHasher'>RandomSipHasher</a>","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/sync/mpmc_bounded_queue/struct.Queue.html' title='std::sync::mpmc_bounded_queue::Queue'>Queue</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/sync/deque/struct.BufferPool.html' title='std::sync::deque::BufferPool'>BufferPool</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/sync/deque/struct.Stealer.html' title='std::sync::deque::Stealer'>Stealer</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/comm/type.TryRecvError.html' title='std::comm::TryRecvError'>TryRecvError</a>","<a class='stability Experimental' title='Experimental'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/comm/type.TrySendError.html' title='std::comm::TrySendError'>TrySendError</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/comm/struct.Sender.html' title='std::comm::Sender'>Sender</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/comm/struct.SyncSender.html' title='std::comm::SyncSender'>SyncSender</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for Box<T>","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a> + <a class='trait' href='std/kinds/trait.Share.html' title='std::kinds::Share'>Share</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/sync/struct.Arc.html' title='std::sync::Arc'>Arc</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T: <a class='trait' href='std/kinds/trait.Send.html' title='std::kinds::Send'>Send</a> + <a class='trait' href='std/kinds/trait.Share.html' title='std::kinds::Share'>Share</a>&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/sync/struct.Weak.html' title='std::sync::Weak'>Weak</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/rc/struct.Rc.html' title='std::rc::Rc'>Rc</a>&lt;T&gt;","<a class='stability Unstable' title='Unstable'></a>impl&lt;T&gt; <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/rc/struct.Weak.html' title='std::rc::Weak'>Weak</a>&lt;T&gt;","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/struct.ChanWriter.html' title='std::io::ChanWriter'>ChanWriter</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/net/tcp/struct.TcpStream.html' title='std::io::net::tcp::TcpStream'>TcpStream</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/net/udp/struct.UdpSocket.html' title='std::io::net::udp::UdpSocket'>UdpSocket</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/io/net/ip/type.IpAddr.html' title='std::io::net::ip::IpAddr'>IpAddr</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/net/ip/struct.SocketAddr.html' title='std::io::net::ip::SocketAddr'>SocketAddr</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/net/unix/struct.UnixStream.html' title='std::io::net::unix::UnixStream'>UnixStream</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/pipe/struct.PipeStream.html' title='std::io::pipe::PipeStream'>PipeStream</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/process/struct.Command.html' title='std::io::process::Command'>Command</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/process/struct.ProcessOutput.html' title='std::io::process::ProcessOutput'>ProcessOutput</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/io/process/type.StdioContainer.html' title='std::io::process::StdioContainer'>StdioContainer</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/io/process/type.ProcessExit.html' title='std::io::process::ProcessExit'>ProcessExit</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/struct.IoError.html' title='std::io::IoError'>IoError</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/io/type.IoErrorKind.html' title='std::io::IoErrorKind'>IoErrorKind</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/io/struct.FilePermission.html' title='std::io::FilePermission'>FilePermission</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/path/posix/struct.Path.html' title='std::path::posix::Path'>Path</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/path/windows/struct.Path.html' title='std::path::windows::Path'>Path</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='type' href='std/path/windows/type.PathPrefix.html' title='std::path::windows::PathPrefix'>PathPrefix</a>","<a class='stability Experimental' title='Experimental'></a>impl <a class='trait' href='std/clone/trait.Clone.html' title='std::clone::Clone'>Clone</a> for <a class='struct' href='std/c_str/struct.CString.html' title='std::c_str::CString'>CString</a>",];

            if (window.register_implementors) {
                window.register_implementors(implementors);
            } else {
                window.pending_implementors = implementors;
            }
        
})()
